from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

from pipeline.env_utils import DEDUPE_PATH, ENRICHED_PATH
from pipeline.gemini_client import DEFAULT_MODEL, generate_structured_json, get_cache_stats


class PeopleClassification(BaseModel):
    role_type: Literal["founder", "operator", "applicant", "investor", "other"]
    sector_tags: list[str] = Field(default_factory=list, max_length=5)
    seniority: Literal["junior", "mid", "senior", "executive"]
    community_fit_tags: list[str] = Field(default_factory=list, max_length=6)


def classify_record(
    record: dict[str, Any],
    model: str = DEFAULT_MODEL,
    use_cache: bool = True,
) -> PeopleClassification:
    prompt = {
        "task": "Classify a person record for Offline, a private community for founders and senior operators.",
        "allowed_role_type": ["founder", "operator", "applicant", "investor", "other"],
        "allowed_seniority": ["junior", "mid", "senior", "executive"],
        "tag_rules": [
            "sector_tags should be lowercase short tags such as fintech, climate, dev tools, consumer, health, ai, ops.",
            "community_fit_tags should describe why this person belongs in a founder/operator community.",
            "Use only evidence in the supplied record.",
        ],
        "record": {key: record.get(key) for key in ["name", "company", "role_title", "bio_notes", "source"]},
    }
    parsed = generate_structured_json(
        prompt_payload=prompt,
        response_schema=PeopleClassification,
        model=model,
        temperature=0.1,
        use_cache=use_cache,
    )
    parsed.sector_tags[:] = [tag.strip().lower() for tag in parsed.sector_tags if tag.strip()][:5]
    parsed.community_fit_tags[:] = [tag.strip().lower() for tag in parsed.community_fit_tags if tag.strip()][:6]
    return parsed


def enrich_records(
    input_path: Path = DEDUPE_PATH,
    output_path: Path = ENRICHED_PATH,
    limit: int | None = None,
    use_cache: bool = True,
    model: str = DEFAULT_MODEL,
) -> list[dict[str, Any]]:
    records = json.loads(input_path.read_text(encoding="utf-8"))
    if limit is not None and limit > 0:
        records = records[:limit]

    now = datetime.now(timezone.utc).isoformat()

    for index, record in enumerate(records, start=1):
        if record.get("is_duplicate_of"):
            record["ai_enrichment_status"] = "skipped"
            record["ai_model"] = model
            record["ai_generated_at"] = now
            continue

        try:
            classification = classify_record(record, model=model, use_cache=use_cache)
            payload = classification.model_dump()
            record.update(payload)
            record["ai_classification"] = payload
            record["ai_enrichment_status"] = "completed"
            record["ai_model"] = model
            record["ai_generated_at"] = datetime.now(timezone.utc).isoformat()
            print(f"enriched={index}/{len(records)} source_record_id={record['source_record_id']}")
        except Exception as exc:
            record["ai_enrichment_status"] = "failed"
            record["ai_classification"] = {"error": str(exc)}
            output_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
            raise

    output_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Classify non-duplicate Offline CRM people records with Gemini.")
    parser.add_argument("--input", type=Path, default=DEDUPE_PATH)
    parser.add_argument("--output", type=Path, default=ENRICHED_PATH)
    parser.add_argument("--limit", type=int, default=None, help="Limit processing to first N records.")
    parser.add_argument("--no-cache", action="store_true", help="Bypass local Gemini disk cache.")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help=f"Gemini model (default: {DEFAULT_MODEL}).")
    args = parser.parse_args()

    records = enrich_records(
        args.input,
        args.output,
        limit=args.limit,
        use_cache=not args.no_cache,
        model=args.model,
    )
    completed = [record for record in records if record.get("ai_enrichment_status") == "completed"]
    stats = get_cache_stats()
    print(f"records={len(records)}")
    print(f"enriched_records={len(completed)}")
    print(f"cache_stats={stats}")
    print(json.dumps(completed[:5], indent=2))


if __name__ == "__main__":
    main()
