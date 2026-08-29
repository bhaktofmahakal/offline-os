from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

from supabase import Client, create_client

from pipeline.clean import clean_records
from pipeline.dedupe import dedupe_records
from pipeline.enrich_classify import enrich_records
from pipeline.fit_score import fit_score_records
from pipeline.intro_match import run_intro_matching, save_introductions_to_supabase
from pipeline.env_utils import (
    CLEANED_PATH,
    DEDUPE_PATH,
    ENRICHED_PATH,
    FIT_SCORED_PATH,
    INTRODUCTIONS_PATH,
    RAW_CSV_PATH,
    ROOT,
    load_project_env,
)
from pipeline.gemini_client import (
    DEFAULT_EMBEDDING_MODEL,
    DEFAULT_MODEL,
    get_cache_stats,
    reset_cache_stats,
)


UPSERT_COLUMNS = [
    "source_record_id",
    "name",
    "email",
    "email_normalized",
    "company",
    "role_title",
    "bio_notes",
    "source",
    "source_payload",
    "role_type",
    "sector_tags",
    "seniority",
    "community_fit_tags",
    "ai_classification",
    "ai_enrichment_status",
    "ai_model",
    "ai_generated_at",
    "fit_score",
    "fit_score_reasoning",
    "duplicate_confidence",
    "is_incomplete",
    "missing_fields",
    "embedding",
    "embedding_model",
    "embedding_text",
]


def ensure_raw_dataset() -> None:
    if RAW_CSV_PATH.exists():
        return
    subprocess.run([sys.executable, str(ROOT / "data" / "generate_dataset.py")], cwd=ROOT, check=True)


def supabase_client() -> Client:
    load_project_env()
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.")
    return create_client(url, service_key)


def _records_for_first_upsert(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{key: record.get(key) for key in UPSERT_COLUMNS if key in record} for record in records]


def _duplicate_source_ids(records: list[dict[str, Any]]) -> dict[str, str]:
    return {
        record["source_record_id"]: record["is_duplicate_of"]
        for record in records
        if record.get("is_duplicate_of")
    }


def upsert_people(records: list[dict[str, Any]]) -> dict[str, int]:
    client = supabase_client()
    payload = _records_for_first_upsert(records)
    response = client.table("people").upsert(payload, on_conflict="source_record_id").execute()
    returned = response.data or []

    id_by_source = {
        row["source_record_id"]: row["id"]
        for row in client.table("people").select("id, source_record_id").execute().data
    }
    duplicate_updates = []
    for source_id, canonical_source_id in _duplicate_source_ids(records).items():
        duplicate_id = id_by_source.get(source_id)
        canonical_id = id_by_source.get(canonical_source_id)
        if duplicate_id and canonical_id:
            duplicate_updates.append({"id": duplicate_id, "is_duplicate_of": canonical_id})

    for update in duplicate_updates:
        client.table("people").update({"is_duplicate_of": update["is_duplicate_of"]}).eq("id", update["id"]).execute()

    return {
        "upserted": len(returned) if returned else len(payload),
        "duplicate_links_updated": len(duplicate_updates),
    }


def run_pipeline(
    limit: int | None = None,
    use_gemini: bool = True,
    use_cache: bool = True,
    skip_supabase: bool = False,
    model: str = DEFAULT_MODEL,
    embedding_model: str = DEFAULT_EMBEDDING_MODEL,
) -> dict[str, Any]:
    ensure_raw_dataset()
    
    # 1. Clean
    cleaned = clean_records(RAW_CSV_PATH, CLEANED_PATH, limit=limit)
    
    # 2. Dedupe
    deduped, duplicate_events = dedupe_records(
        CLEANED_PATH,
        DEDUPE_PATH,
        use_gemini=use_gemini,
        use_cache=use_cache,
        model=model,
    )
    
    # 3. Enrich & Classify
    enriched = enrich_records(
        DEDUPE_PATH,
        ENRICHED_PATH,
        use_cache=use_cache,
        model=model,
    )
    
    # 4. Fit Scoring (Rubric + Gemini Explainable Reasoning)
    fit_scored = fit_score_records(
        ENRICHED_PATH,
        FIT_SCORED_PATH,
        use_cache=use_cache,
        model=model,
    )
    
    # 5. Intro Matching (Embeddings + Cosine Similarity + Gemini Rationale)
    embedded_records, intros = run_intro_matching(
        FIT_SCORED_PATH,
        INTRODUCTIONS_PATH,
        use_cache=use_cache,
        model=model,
        embedding_model=embedding_model,
    )
    
    cache_stats = get_cache_stats()
    valid_scores = [r["fit_score"] for r in fit_scored if r.get("fit_score") is not None]
    
    result: dict[str, Any] = {
        "cleaned_records": len(cleaned),
        "duplicates_flagged": len(duplicate_events),
        "enriched_records": sum(1 for record in fit_scored if record.get("ai_enrichment_status") == "completed"),
        "skipped_duplicates": sum(1 for record in fit_scored if record.get("ai_enrichment_status") == "skipped"),
        "fit_scores_summary": {
            "total_scored": len(valid_scores),
            "min": min(valid_scores) if valid_scores else None,
            "max": max(valid_scores) if valid_scores else None,
            "avg": round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else None,
        },
        "introductions_generated": len(intros),
        "cache_stats": cache_stats,
    }
    
    if not skip_supabase:
        result["supabase_people"] = upsert_people(embedded_records)
        result["supabase_introductions"] = save_introductions_to_supabase(intros, embedded_records)
        
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Run complete Offline CRM pipeline: Clean -> Dedupe -> Enrich -> Fit Score -> Intro Match -> Supabase.")
    parser.add_argument("--limit", type=int, default=None, help="Limit processing to first N records (e.g. --limit 5).")
    parser.add_argument("--no-gemini", action="store_true", help="Skip Gemini judgment in dedupe.")
    parser.add_argument("--no-cache", action="store_true", help="Bypass local Gemini disk cache.")
    parser.add_argument("--skip-supabase", action="store_true", help="Run local outputs without writing to Supabase.")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help=f"Gemini model (default: {DEFAULT_MODEL}).")
    parser.add_argument("--embedding-model", type=str, default=DEFAULT_EMBEDDING_MODEL, help=f"Embedding model (default: {DEFAULT_EMBEDDING_MODEL}).")
    args = parser.parse_args()

    result = run_pipeline(
        limit=args.limit,
        use_gemini=not args.no_gemini,
        use_cache=not args.no_cache,
        skip_supabase=args.skip_supabase,
        model=args.model,
        embedding_model=args.embedding_model,
    )
    print("\n================== PIPELINE RUN RESULTS ==================")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
