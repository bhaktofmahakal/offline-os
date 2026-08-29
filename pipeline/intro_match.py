from __future__ import annotations

import argparse
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field
from supabase import Client, create_client

from pipeline.env_utils import FIT_SCORED_PATH, INTRODUCTIONS_PATH, load_project_env
from pipeline.gemini_client import (
    DEFAULT_EMBEDDING_MODEL,
    DEFAULT_MODEL,
    generate_embedding,
    generate_structured_json,
    get_cache_stats,
)


MIN_SIMILARITY_THRESHOLD = 0.60
MAX_INTROS_PER_PERSON = 3
MAX_GLOBAL_INTROS = 30


class IntroRationale(BaseModel):
    match_band: Literal["strong", "good", "moderate"]
    shared_context: str = Field(description="Short 3-6 word summary of their primary overlap or synergy.")
    suggested_intro: str = Field(description="1 warm, natural sentence introducing Person A to Person B.")
    reasoning: str = Field(description="1-2 sentences explaining why this connection is mutually valuable.")


def _to_float_list(vec: Any) -> list[float]:
    if isinstance(vec, str):
        try:
            return json.loads(vec)
        except Exception:
            return [float(x.strip()) for x in vec.strip("[]").split(",") if x.strip()]
    return [float(x) for x in vec] if vec else []


def _dot_product(vec1: list[float], vec2: list[float]) -> float:
    return sum(a * b for a, b in zip(vec1, vec2))


def _magnitude(vec: list[float]) -> float:
    return math.sqrt(sum(a * a for a in vec))


def cosine_similarity(vec1: Any, vec2: Any) -> float:
    v1 = _to_float_list(vec1)
    v2 = _to_float_list(vec2)
    if not v1 or not v2:
        return 0.0
    mag1 = _magnitude(v1)
    mag2 = _magnitude(v2)
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return _dot_product(v1, v2) / (mag1 * mag2)



def make_embedding_text(record: dict[str, Any]) -> str:
    parts = [
        f"Name: {record.get('name')}",
        f"Role: {record.get('role_title')} at {record.get('company') or 'Stealth/Independent'}",
        f"Classification: {record.get('seniority')} {record.get('role_type')}",
        f"Sectors: {', '.join(record.get('sector_tags', []))}",
        f"Community Tags: {', '.join(record.get('community_fit_tags', []))}",
        f"Bio: {record.get('bio_notes') or ''}",
    ]
    return " | ".join(p for p in parts if p)


def embed_people_records(
    records: list[dict[str, Any]],
    embedding_model: str = DEFAULT_EMBEDDING_MODEL,
    use_cache: bool = True,
) -> list[dict[str, Any]]:
    output = [dict(r) for r in records]
    for index, record in enumerate(output, start=1):
        if record.get("is_duplicate_of"):
            record["embedding"] = None
            record["embedding_model"] = None
            record["embedding_text"] = None
            continue

        text = make_embedding_text(record)
        record["embedding_text"] = text
        record["embedding_model"] = embedding_model
        try:
            vec = generate_embedding(text, model=embedding_model, use_cache=use_cache)
            record["embedding"] = vec
            print(f"embedded={index}/{len(output)} source_record_id={record['source_record_id']}")
        except Exception as exc:
            print(f"[EMBEDDING ERROR] Failed for {record.get('source_record_id')}: {exc}")
            record["embedding"] = None

    return output


def generate_intro_rationale(
    person_a: dict[str, Any],
    person_b: dict[str, Any],
    sim_score: float,
    model: str = DEFAULT_MODEL,
    use_cache: bool = True,
) -> IntroRationale:
    prompt = {
        "task": "Evaluate an introduction between two members of Offline, a private founder/operator community.",
        "similarity_score": round(sim_score, 4),
        "person_a": {
            "name": person_a.get("name"),
            "role": person_a.get("role_title"),
            "company": person_a.get("company"),
            "seniority": person_a.get("seniority"),
            "role_type": person_a.get("role_type"),
            "sectors": person_a.get("sector_tags"),
            "tags": person_a.get("community_fit_tags"),
            "bio": person_a.get("bio_notes"),
        },
        "person_b": {
            "name": person_b.get("name"),
            "role": person_b.get("role_title"),
            "company": person_b.get("company"),
            "seniority": person_b.get("seniority"),
            "role_type": person_b.get("role_type"),
            "sectors": person_b.get("sector_tags"),
            "tags": person_b.get("community_fit_tags"),
            "bio": person_b.get("bio_notes"),
        },
        "guidelines": [
            "Explain specifically how their domains, challenges, or backgrounds align.",
            "Write a warm 1-sentence draft intro message.",
            "Select match_band: 'strong' (score > 0.78 or high synergy), 'good' (score > 0.68), or 'moderate'.",
        ],
    }
    return generate_structured_json(
        prompt_payload=prompt,
        response_schema=IntroRationale,
        model=model,
        temperature=0.1,
        use_cache=use_cache,
    )


def match_introductions(
    records: list[dict[str, Any]],
    model: str = DEFAULT_MODEL,
    embedding_model: str = DEFAULT_EMBEDDING_MODEL,
    min_similarity: float = MIN_SIMILARITY_THRESHOLD,
    max_per_person: int = MAX_INTROS_PER_PERSON,
    max_total_intros: int = MAX_GLOBAL_INTROS,
    use_cache: bool = True,
) -> list[dict[str, Any]]:
    # Filter active, non-duplicate records with valid embeddings
    active = [r for r in records if not r.get("is_duplicate_of") and r.get("embedding")]
    if len(active) < 2:
        return []

    # Score all distinct pairs
    candidate_pairs: list[tuple[float, int, int]] = []
    seen_pairs: set[tuple[int, int]] = set()

    for i in range(len(active)):
        for j in range(i + 1, len(active)):
            rec_a = active[i]
            rec_b = active[j]
            # Skip same company or same person name
            name_a = (rec_a.get("name") or "").strip().lower()
            name_b = (rec_b.get("name") or "").strip().lower()
            if name_a and name_b and name_a == name_b:
                continue

            company_a = (rec_a.get("company") or "").strip().lower()
            company_b = (rec_b.get("company") or "").strip().lower()
            if company_a and company_b and company_a == company_b:
                continue

            sim = cosine_similarity(rec_a["embedding"], rec_b["embedding"])
            if sim >= min_similarity:
                candidate_pairs.append((sim, i, j))

    # Sort descending by cosine similarity
    candidate_pairs.sort(key=lambda x: x[0], reverse=True)

    # Select balanced diverse set per person
    person_counts: dict[int, int] = {i: 0 for i in range(len(active))}
    selected_pairs: list[tuple[float, dict[str, Any], dict[str, Any]]] = []

    for sim, i, j in candidate_pairs:
        if person_counts[i] < max_per_person and person_counts[j] < max_per_person:
            selected_pairs.append((sim, active[i], active[j]))
            person_counts[i] += 1
            person_counts[j] += 1
            if len(selected_pairs) >= max_total_intros:
                break

    print(f"Generating AI reasoning for {len(selected_pairs)} top introduction matches...")
    intros: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc).isoformat()

    for index, (sim, rec_a, rec_b) in enumerate(selected_pairs, start=1):
        try:
            rationale = generate_intro_rationale(rec_a, rec_b, sim, model=model, use_cache=use_cache)
            intros.append({
                "person_a_source_id": rec_a["source_record_id"],
                "person_b_source_id": rec_b["source_record_id"],
                "person_a_name": rec_a["name"],
                "person_b_name": rec_b["name"],
                "person_a_company": rec_a.get("company"),
                "person_b_company": rec_b.get("company"),
                "match_score": round(sim, 4),
                "match_band": rationale.match_band,
                "shared_context": rationale.shared_context,
                "suggested_intro": rationale.suggested_intro,
                "reasoning": rationale.reasoning,
                "evidence_snapshot": {
                    "person_a": {
                        "name": rec_a["name"],
                        "role": rec_a.get("role_title"),
                        "company": rec_a.get("company"),
                        "sectors": rec_a.get("sector_tags", []),
                        "fit_tags": rec_a.get("community_fit_tags", []),
                    },
                    "person_b": {
                        "name": rec_b["name"],
                        "role": rec_b.get("role_title"),
                        "company": rec_b.get("company"),
                        "sectors": rec_b.get("sector_tags", []),
                        "fit_tags": rec_b.get("community_fit_tags", []),
                    },
                },
                "status": "pending",
                "generated_by": f"gemini-embedding+{model}",
                "embedding_model": embedding_model,
                "generated_at": now,
            })
            print(f"intro_generated={index}/{len(selected_pairs)} {rec_a['name']} <> {rec_b['name']} ({rationale.match_band}, sim={sim:.3f})")
        except Exception as exc:
            print(f"[INTRO RATIONALE ERROR] {rec_a['name']} <> {rec_b['name']}: {exc}")

    return intros


def save_introductions_to_supabase(intros: list[dict[str, Any]], records: list[dict[str, Any]]) -> dict[str, int]:
    load_project_env()
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not service_key:
        print("[WARNING] Supabase credentials missing. Skipping Supabase introduction insert.")
        return {"inserted": 0}

    client = create_client(url, service_key)

    # Map source_record_id -> bigint DB id
    db_people = client.table("people").select("id, source_record_id").execute().data or []
    source_to_id = {row["source_record_id"]: row["id"] for row in db_people}

    # Also update embeddings on people table in Supabase
    for r in records:
        source_id = r.get("source_record_id")
        db_id = source_to_id.get(source_id)
        if db_id and r.get("embedding"):
            client.table("people").update({
                "embedding": r["embedding"],
                "embedding_model": r.get("embedding_model"),
                "embedding_text": r.get("embedding_text"),
                "fit_score": r.get("fit_score"),
                "fit_score_reasoning": r.get("fit_score_reasoning"),
            }).eq("id", db_id).execute()

    payload = []
    seen_db_pairs: set[tuple[int, int]] = set()
    for intro in intros:
        raw_a = source_to_id.get(intro["person_a_source_id"])
        raw_b = source_to_id.get(intro["person_b_source_id"])
        if raw_a and raw_b and raw_a != raw_b:
            id_a, id_b = min(raw_a, raw_b), max(raw_a, raw_b)
            if (id_a, id_b) in seen_db_pairs:
                continue
            seen_db_pairs.add((id_a, id_b))
            payload.append({
                "person_a_id": id_a,
                "person_b_id": id_b,
                "match_score": intro["match_score"],
                "match_band": intro["match_band"],
                "shared_context": intro["shared_context"],
                "suggested_intro": intro["suggested_intro"],
                "reasoning": intro["reasoning"],
                "evidence_snapshot": intro["evidence_snapshot"],
                "status": intro["status"],
                "generated_by": intro["generated_by"],
                "embedding_model": intro["embedding_model"],
                "generated_at": intro["generated_at"],
            })

    if payload:
        # Delete old pending intro suggestions to avoid stale duplicates
        try:
            client.table("introductions").delete().eq("status", "pending").execute()
        except Exception:
            pass
        res = client.table("introductions").insert(payload).execute()
        return {"inserted": len(payload)}
    return {"inserted": 0}



def run_intro_matching(
    input_path: Path = FIT_SCORED_PATH,
    output_path: Path = INTRODUCTIONS_PATH,
    limit: int | None = None,
    use_cache: bool = True,
    model: str = DEFAULT_MODEL,
    embedding_model: str = DEFAULT_EMBEDDING_MODEL,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records = json.loads(input_path.read_text(encoding="utf-8"))
    if limit is not None and limit > 0:
        records = records[:limit]

    embedded_records = embed_people_records(records, embedding_model=embedding_model, use_cache=use_cache)
    intros = match_introductions(
        embedded_records,
        model=model,
        embedding_model=embedding_model,
        use_cache=use_cache,
    )
    output_path.write_text(json.dumps(intros, indent=2), encoding="utf-8")
    return embedded_records, intros


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate embeddings and AI-suggested introductions between people.")
    parser.add_argument("--input", type=Path, default=FIT_SCORED_PATH)
    parser.add_argument("--output", type=Path, default=INTRODUCTIONS_PATH)
    parser.add_argument("--limit", type=int, default=None, help="Limit processing to first N records.")
    parser.add_argument("--no-cache", action="store_true", help="Bypass local Gemini disk cache.")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help=f"Gemini generation model (default: {DEFAULT_MODEL}).")
    parser.add_argument("--embedding-model", type=str, default=DEFAULT_EMBEDDING_MODEL, help=f"Embedding model (default: {DEFAULT_EMBEDDING_MODEL}).")
    parser.add_argument("--skip-supabase", action="store_true", help="Skip writing embeddings and intros to Supabase.")
    args = parser.parse_args()

    embedded, intros = run_intro_matching(
        args.input,
        args.output,
        limit=args.limit,
        use_cache=not args.no_cache,
        model=args.model,
        embedding_model=args.embedding_model,
    )

    if not args.skip_supabase:
        res = save_introductions_to_supabase(intros, embedded)
        print(f"Supabase sync: {res}")

    print(f"\nTotal introductions generated: {len(intros)}")
    print(f"Cache stats: {get_cache_stats()}")
    print("\nSample 3 Introductions:")
    for intro in intros[:3]:
        print(f"- [{intro['match_band'].upper()}] {intro['person_a_name']} ({intro['person_a_company']}) <> {intro['person_b_name']} ({intro['person_b_company']})")
        print(f"  Context: {intro['shared_context']}")
        print(f"  Intro: \"{intro['suggested_intro']}\"")
        print(f"  Why: {intro['reasoning']}\n")


if __name__ == "__main__":
    main()
