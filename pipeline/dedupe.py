from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field
from rapidfuzz import fuzz

from pipeline.env_utils import CLEANED_PATH, DEDUPE_PATH
from pipeline.gemini_client import DEFAULT_MODEL, generate_structured_json


OBVIOUS_DUPLICATE_THRESHOLD = 92.0
AMBIGUOUS_LOW = 82.0
AMBIGUOUS_HIGH = 92.0
MIN_CANDIDATE_THRESHOLD = 78.0


class DuplicateJudgment(BaseModel):
    same_person: bool = Field(description="Whether the two CRM records refer to the same human.")
    confidence: float = Field(ge=0, le=1, description="Confidence from 0 to 1.")
    reasoning: str = Field(description="Short reason based only on supplied fields.")


@dataclass(frozen=True)
class PairScore:
    left_index: int
    right_index: int
    token_sort_ratio: float
    partial_ratio: float
    similarity: float


def _compact(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip().lower())


def _composite(record: dict[str, Any]) -> str:
    return " | ".join(
        [
            _compact(record.get("name")),
            _compact(record.get("email_normalized") or record.get("email")),
            _compact(record.get("company")),
        ]
    )


def _score_pair(left: dict[str, Any], right: dict[str, Any], left_index: int, right_index: int) -> PairScore:
    left_text = _composite(left)
    right_text = _composite(right)
    token_sort = float(fuzz.token_sort_ratio(left_text, right_text))
    partial = float(fuzz.partial_ratio(left_text, right_text))
    exact_email_boost = 8.0 if left.get("email_normalized") and left.get("email_normalized") == right.get("email_normalized") else 0.0
    exact_name_company_boost = (
        5.0
        if _compact(left.get("name")) == _compact(right.get("name"))
        and _compact(left.get("company")) == _compact(right.get("company"))
        else 0.0
    )
    similarity = min(100.0, (token_sort * 0.62) + (partial * 0.38) + exact_email_boost + exact_name_company_boost)
    return PairScore(left_index, right_index, token_sort, partial, round(similarity, 2))


def find_candidate_pairs(records: list[dict[str, Any]], min_similarity: float = MIN_CANDIDATE_THRESHOLD) -> list[PairScore]:
    pairs: list[PairScore] = []
    for left_index in range(len(records)):
        for right_index in range(left_index + 1, len(records)):
            score = _score_pair(records[left_index], records[right_index], left_index, right_index)
            if score.similarity >= min_similarity:
                pairs.append(score)
    return sorted(pairs, key=lambda pair: pair.similarity, reverse=True)


def judge_pair_with_gemini(
    left: dict[str, Any],
    right: dict[str, Any],
    model: str = DEFAULT_MODEL,
    use_cache: bool = True,
) -> DuplicateJudgment:
    prompt = {
        "task": "Judge whether two messy CRM records represent the same person.",
        "rules": [
            "Use only the supplied fields.",
            "Name spelling/casing differences can still be same person.",
            "Same company plus similar role strongly increases confidence.",
            "Different exact emails can still be old/new aliases.",
            "Return concise reasoning.",
        ],
        "record_a": {key: left.get(key) for key in ["source_record_id", "name", "email", "company", "role_title", "bio_notes"]},
        "record_b": {key: right.get(key) for key in ["source_record_id", "name", "email", "company", "role_title", "bio_notes"]},
    }
    return generate_structured_json(
        prompt_payload=prompt,
        response_schema=DuplicateJudgment,
        model=model,
        temperature=0.0,
        use_cache=use_cache,
    )


def apply_dedupe(
    records: list[dict[str, Any]],
    use_gemini: bool = True,
    use_cache: bool = True,
    model: str = DEFAULT_MODEL,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    output = [dict(record) for record in records]
    candidates = find_candidate_pairs(output)
    duplicate_events: list[dict[str, Any]] = []

    duplicate_parent_by_index: dict[int, int] = {}
    for pair in candidates:
        left = output[pair.left_index]
        right = output[pair.right_index]
        decision_source: Literal["rapidfuzz", "gemini"] = "rapidfuzz"
        same_person = pair.similarity >= OBVIOUS_DUPLICATE_THRESHOLD
        confidence = round(pair.similarity / 100, 4)
        reasoning = (
            f"RapidFuzz composite score {pair.similarity}; "
            f"token_sort={pair.token_sort_ratio:.1f}, partial={pair.partial_ratio:.1f}."
        )

        if AMBIGUOUS_LOW <= pair.similarity < AMBIGUOUS_HIGH:
            if not use_gemini:
                continue
            judgment = judge_pair_with_gemini(left, right, model=model, use_cache=use_cache)
            same_person = judgment.same_person
            confidence = round(judgment.confidence, 4)
            reasoning = judgment.reasoning
            decision_source = "gemini"

        if same_person and pair.right_index not in duplicate_parent_by_index:
            duplicate_parent_by_index[pair.right_index] = pair.left_index
            right["is_duplicate_of"] = left["source_record_id"]
            right["duplicate_confidence"] = confidence
            duplicate_events.append(
                {
                    "duplicate": right["source_record_id"],
                    "canonical": left["source_record_id"],
                    "duplicate_name": right["name"],
                    "canonical_name": left["name"],
                    "similarity": pair.similarity,
                    "confidence": confidence,
                    "decision_source": decision_source,
                    "reasoning": reasoning,
                }
            )

    return output, duplicate_events


def dedupe_records(
    input_path: Path = CLEANED_PATH,
    output_path: Path = DEDUPE_PATH,
    use_gemini: bool = True,
    use_cache: bool = True,
    limit: int | None = None,
    model: str = DEFAULT_MODEL,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records = json.loads(input_path.read_text(encoding="utf-8"))
    if limit is not None and limit > 0:
        records = records[:limit]
    deduped, events = apply_dedupe(records, use_gemini=use_gemini, use_cache=use_cache, model=model)
    output_path.write_text(json.dumps(deduped, indent=2), encoding="utf-8")
    (output_path.parent / "duplicate_candidates.json").write_text(json.dumps(events, indent=2), encoding="utf-8")
    return deduped, events


def main() -> None:
    parser = argparse.ArgumentParser(description="Find duplicate people records with RapidFuzz and Gemini for ambiguous pairs.")
    parser.add_argument("--input", type=Path, default=CLEANED_PATH)
    parser.add_argument("--output", type=Path, default=DEDUPE_PATH)
    parser.add_argument("--no-gemini", action="store_true", help="Skip Gemini judgment for ambiguous duplicate pairs.")
    parser.add_argument("--no-cache", action="store_true", help="Bypass local Gemini disk cache.")
    parser.add_argument("--limit", type=int, default=None, help="Limit processing to first N records.")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help=f"Gemini model (default: {DEFAULT_MODEL}).")
    args = parser.parse_args()

    records, events = dedupe_records(
        args.input,
        args.output,
        use_gemini=not args.no_gemini,
        use_cache=not args.no_cache,
        limit=args.limit,
        model=args.model,
    )
    print(f"records={len(records)}")
    print(f"duplicates_flagged={len(events)}")
    print(json.dumps(events[:10], indent=2))


if __name__ == "__main__":
    main()
