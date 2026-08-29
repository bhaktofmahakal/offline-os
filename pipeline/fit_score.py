from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from pipeline.env_utils import ENRICHED_PATH, FIT_SCORED_PATH, load_project_env
from pipeline.gemini_client import DEFAULT_MODEL, generate_structured_json, get_cache_stats


CORE_SECTORS = {
    "fintech",
    "climate",
    "dev tools",
    "devtools",
    "consumer",
    "health",
    "ai",
    "ops",
    "saas",
    "enterprise",
    "e-commerce",
}

SENIORITY_SCORES = {
    "executive": 18.0,
    "senior": 14.0,
    "mid": 8.0,
    "junior": 4.0,
}

ROLE_TYPE_SCORES = {
    "founder": 12.0,
    "operator": 10.0,
    "investor": 10.0,
    "applicant": 7.0,
    "other": 3.0,
}


class FitScoreExplanation(BaseModel):
    fit_score_reasoning: str = Field(
        description="1-2 concise sentences explaining why this person received this score based on their role, seniority, sector, and community fit evidence."
    )


def calculate_base_fit_score(record: dict[str, Any]) -> tuple[float, dict[str, float]]:
    """
    Computes a deterministic, rubric-based score (0-100) across 4 dimensions:
    1. Seniority & Role Level (Max 30)
    2. Sector Relevance to Offline Network (Max 25)
    3. Community Fit Signal from Tags (Max 25)
    4. Profile Completeness & Evidence Quality (Max 20)
    """
    seniority = (record.get("seniority") or "mid").lower()
    role_type = (record.get("role_type") or "applicant").lower()
    seniority_pts = SENIORITY_SCORES.get(seniority, 8.0)
    role_pts = ROLE_TYPE_SCORES.get(role_type, 6.0)
    leadership_score = min(30.0, seniority_pts + role_pts)

    sector_tags = [str(t).lower().strip() for t in record.get("sector_tags", [])]
    matched_core = sum(1 for tag in sector_tags if any(core in tag for core in CORE_SECTORS))
    sector_score = min(25.0, matched_core * 8.5)

    fit_tags = record.get("community_fit_tags", [])
    community_score = min(25.0, len(fit_tags) * 6.5)

    missing_fields = record.get("missing_fields", [])
    completeness_penalty = 10.0 if record.get("is_incomplete") else 0.0
    completeness_penalty += len(missing_fields) * 3.0
    completeness_score = max(0.0, 20.0 - completeness_penalty)

    total_score = min(100.0, max(0.0, leadership_score + sector_score + community_score + completeness_score))
    breakdown = {
        "leadership_pts": round(leadership_score, 1),
        "sector_pts": round(sector_score, 1),
        "community_pts": round(community_score, 1),
        "completeness_pts": round(completeness_score, 1),
    }
    return round(total_score, 1), breakdown


def explain_fit_score(
    record: dict[str, Any],
    score: float,
    breakdown: dict[str, float],
    model: str = DEFAULT_MODEL,
    use_cache: bool = True,
) -> str:
    prompt = {
        "task": "Explain why this candidate received their applicant fit score for Offline, a private founder/operator community.",
        "candidate": {
            "name": record.get("name"),
            "role_title": record.get("role_title"),
            "company": record.get("company"),
            "seniority": record.get("seniority"),
            "role_type": record.get("role_type"),
            "sector_tags": record.get("sector_tags"),
            "community_fit_tags": record.get("community_fit_tags"),
            "bio_notes": record.get("bio_notes"),
            "is_incomplete": record.get("is_incomplete"),
            "missing_fields": record.get("missing_fields"),
        },
        "score_details": {
            "total_fit_score": score,
            "max_score": 100,
            "breakdown": breakdown,
        },
        "guidelines": [
            "Provide 1-2 concise, objective sentences explaining the score based purely on the evidence.",
            "Mention their seniority, primary sector, and standout experience.",
            "If incomplete or missing fields lowered the score, state that transparently.",
        ],
    }
    res = generate_structured_json(
        prompt_payload=prompt,
        response_schema=FitScoreExplanation,
        model=model,
        temperature=0.1,
        use_cache=use_cache,
    )
    return res.fit_score_reasoning


def apply_fit_scoring(
    records: list[dict[str, Any]],
    model: str = DEFAULT_MODEL,
    use_cache: bool = True,
) -> list[dict[str, Any]]:
    output = [dict(r) for r in records]
    for index, record in enumerate(output, start=1):
        if record.get("is_duplicate_of"):
            record["fit_score"] = None
            record["fit_score_reasoning"] = "Duplicate record - excluded from fit scoring."
            continue

        score, breakdown = calculate_base_fit_score(record)
        record["fit_score"] = score
        try:
            reasoning = explain_fit_score(record, score, breakdown, model=model, use_cache=use_cache)
            record["fit_score_reasoning"] = reasoning
            print(f"fit_scored={index}/{len(output)} source_record_id={record['source_record_id']} score={score}")
        except Exception as exc:
            record["fit_score_reasoning"] = f"Deterministic fit score: {score}/100. (Reasoning generation error: {exc})"

    return output


def fit_score_records(
    input_path: Path = ENRICHED_PATH,
    output_path: Path = FIT_SCORED_PATH,
    limit: int | None = None,
    use_cache: bool = True,
    model: str = DEFAULT_MODEL,
) -> list[dict[str, Any]]:
    records = json.loads(input_path.read_text(encoding="utf-8"))
    if limit is not None and limit > 0:
        records = records[:limit]

    scored = apply_fit_scoring(records, model=model, use_cache=use_cache)
    output_path.write_text(json.dumps(scored, indent=2), encoding="utf-8")
    return scored


def main() -> None:
    parser = argparse.ArgumentParser(description="Calculate rubric-based fit score and generate explainable reasoning.")
    parser.add_argument("--input", type=Path, default=ENRICHED_PATH)
    parser.add_argument("--output", type=Path, default=FIT_SCORED_PATH)
    parser.add_argument("--limit", type=int, default=None, help="Limit processing to first N records.")
    parser.add_argument("--no-cache", action="store_true", help="Bypass local Gemini disk cache.")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help=f"Gemini model (default: {DEFAULT_MODEL}).")
    args = parser.parse_args()

    records = fit_score_records(
        args.input,
        args.output,
        limit=args.limit,
        use_cache=not args.no_cache,
        model=args.model,
    )
    valid_scores = [r["fit_score"] for r in records if r.get("fit_score") is not None]
    if valid_scores:
        print(f"Total scored: {len(valid_scores)}")
        print(f"Min: {min(valid_scores)}, Max: {max(valid_scores)}, Avg: {sum(valid_scores)/len(valid_scores):.1f}")
    print(f"Cache stats: {get_cache_stats()}")
    print("\nSample 3 fit scores:")
    for r in records[:3]:
        print(f"- {r['name']} ({r['source_record_id']}): {r['fit_score']}/100 -> {r['fit_score_reasoning']}")


if __name__ == "__main__":
    main()
