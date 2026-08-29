from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client

from pipeline.clean import clean_dataframe, load_raw_records
from pipeline.dedupe import find_candidate_pairs, judge_pair_with_gemini, OBVIOUS_DUPLICATE_THRESHOLD, AMBIGUOUS_LOW, AMBIGUOUS_HIGH
from pipeline.enrich_classify import classify_record
from pipeline.env_utils import CLEANED_PATH, DATA_DIR, load_project_env
from pipeline.fit_score import calculate_base_fit_score, explain_fit_score
from pipeline.gemini_client import (
    DEFAULT_EMBEDDING_MODEL,
    DEFAULT_MODEL,
    generate_embedding,
    get_cache_stats,
)
from pipeline.intro_match import (
    cosine_similarity,
    generate_intro_rationale,
    make_embedding_text,
)

app = FastAPI(
    title="Offline CRM Pipeline API",
    description="Webhook endpoint for processing incoming applicant records through clean, dedupe, enrich, fit score, and intro matching.",
    version="1.0.0",
)

# CORS configuration
allowed_origins = [
    origin.strip() for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "https://offline-os-gray.vercel.app,http://localhost:3000"
    ).split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class IncomingRecord(BaseModel):
    source_record_id: Optional[str] = Field(default=None, description="Optional external ID (auto-generated if omitted).")
    name: str = Field(..., description="Full name of the person.")
    email: Optional[str] = Field(default=None, description="Email address.")
    company: Optional[str] = Field(default=None, description="Company or startup name.")
    role_title: Optional[str] = Field(default=None, description="Job title or role.")
    bio_notes: Optional[str] = Field(default=None, description="Background, bio notes, or application answers.")
    source: Optional[str] = Field(default="webhook", description="Lead source (e.g. webhook, referral, applicant, event).")


def get_supabase_client():
    load_project_env()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cache_stats": get_cache_stats(),
    }


@app.post("/process-new-record")
def process_new_record(payload: IncomingRecord):
    import pandas as pd

    now = datetime.now(timezone.utc).isoformat()
    record_id = payload.source_record_id or f"webhook-{int(datetime.now().timestamp())}"

    # 1. Clean incoming record
    raw_dict = {
        "source_record_id": record_id,
        "name": payload.name,
        "email": payload.email or "",
        "company": payload.company or "",
        "role_title": payload.role_title or "",
        "bio_notes": payload.bio_notes or "",
        "source": payload.source or "webhook",
    }
    df = pd.DataFrame([raw_dict])
    try:
        cleaned_df = clean_dataframe(df)
        cleaned_record = json.loads(cleaned_df.to_json(orient="records"))[0]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cleaning failed: {exc}")

    # 2. Check Deduplication against existing dataset
    existing_people = []
    sb_client = get_supabase_client()
    if sb_client:
        try:
            res = sb_client.table("people").select("*").execute()
            existing_people = res.data or []
        except Exception as e:
            print(f"[WARNING] Supabase fetch failed: {e}")

    if not existing_people and CLEANED_PATH.exists():
        existing_people = json.loads(CLEANED_PATH.read_text(encoding="utf-8"))

    is_dup = False
    dup_parent_id = None
    dup_confidence = None
    dup_reasoning = None

    if existing_people:
        test_pool = existing_people + [cleaned_record]
        target_idx = len(test_pool) - 1
        for idx, other in enumerate(existing_people):
            # Skip comparing against itself if already in database
            if other.get("source_record_id") == cleaned_record["source_record_id"]:
                continue
            from pipeline.dedupe import _score_pair
            pair_score = _score_pair(other, cleaned_record, idx, target_idx)
            if pair_score.similarity >= OBVIOUS_DUPLICATE_THRESHOLD:
                is_dup = True
                dup_parent_id = other.get("source_record_id") or str(other.get("id"))
                dup_confidence = round(pair_score.similarity / 100, 4)
                dup_reasoning = f"RapidFuzz composite similarity {pair_score.similarity}% with {other.get('name')} ({other.get('company')})."
                break
            elif AMBIGUOUS_LOW <= pair_score.similarity < AMBIGUOUS_HIGH:
                judgment = judge_pair_with_gemini(other, cleaned_record)
                if judgment.same_person:
                    is_dup = True
                    dup_parent_id = other.get("source_record_id") or str(other.get("id"))
                    dup_confidence = round(judgment.confidence, 4)
                    dup_reasoning = judgment.reasoning
                    break


    if is_dup:
        cleaned_record["is_duplicate_of"] = dup_parent_id
        cleaned_record["duplicate_confidence"] = dup_confidence
        cleaned_record["ai_enrichment_status"] = "skipped"
        cleaned_record["fit_score"] = None
        cleaned_record["fit_score_reasoning"] = f"Duplicate of {dup_parent_id}: {dup_reasoning}"

        if sb_client:
            # Save duplicate row to Supabase
            try:
                # Find DB integer id for parent
                parent_db_row = sb_client.table("people").select("id").eq("source_record_id", dup_parent_id).execute().data
                parent_db_id = parent_db_row[0]["id"] if parent_db_row else None
                insert_payload = {
                    "source_record_id": cleaned_record["source_record_id"],
                    "name": cleaned_record["name"],
                    "email": cleaned_record["email"],
                    "email_normalized": cleaned_record["email_normalized"],
                    "company": cleaned_record["company"],
                    "role_title": cleaned_record["role_title"],
                    "bio_notes": cleaned_record["bio_notes"],
                    "source": cleaned_record["source"],
                    "is_incomplete": cleaned_record["is_incomplete"],
                    "missing_fields": cleaned_record["missing_fields"],
                    "is_duplicate_of": parent_db_id,
                    "duplicate_confidence": dup_confidence,
                    "ai_enrichment_status": "skipped",
                }
                sb_client.table("people").upsert(insert_payload, on_conflict="source_record_id").execute()
            except Exception as e:
                print(f"[WARNING] Supabase duplicate insert error: {e}")

        return {
            "status": "duplicate_flagged",
            "source_record_id": cleaned_record["source_record_id"],
            "name": cleaned_record["name"],
            "is_duplicate": True,
            "duplicate_of": dup_parent_id,
            "confidence": dup_confidence,
            "reasoning": dup_reasoning,
            "suggested_actions": ["Review in Duplicates Queue", "Merge with canonical"],
        }

    # 3. Enrich with Gemini Classification
    try:
        classification = classify_record(cleaned_record)
        class_dict = classification.model_dump()
        cleaned_record.update(class_dict)
        cleaned_record["ai_classification"] = class_dict
        cleaned_record["ai_enrichment_status"] = "completed"
        cleaned_record["ai_model"] = DEFAULT_MODEL
        cleaned_record["ai_generated_at"] = now
    except Exception as e:
        cleaned_record["ai_enrichment_status"] = "failed"
        cleaned_record["ai_classification"] = {"error": str(e)}

    # 4. Calculate Fit Score & Explainable Reasoning
    score, breakdown = calculate_base_fit_score(cleaned_record)
    cleaned_record["fit_score"] = score
    try:
        reasoning = explain_fit_score(cleaned_record, score, breakdown)
        cleaned_record["fit_score_reasoning"] = reasoning
    except Exception as e:
        cleaned_record["fit_score_reasoning"] = f"Deterministic fit score: {score}/100."

    # 5. Generate Embedding
    emb_text = make_embedding_text(cleaned_record)
    cleaned_record["embedding_text"] = emb_text
    cleaned_record["embedding_model"] = DEFAULT_EMBEDDING_MODEL
    try:
        vec = generate_embedding(emb_text)
        cleaned_record["embedding"] = vec
    except Exception as e:
        print(f"[EMBEDDING ERROR] {e}")
        cleaned_record["embedding"] = None

    # 6. Save to Supabase
    db_id = None
    if sb_client:
        try:
            upsert_payload = {
                "source_record_id": cleaned_record["source_record_id"],
                "name": cleaned_record["name"],
                "email": cleaned_record["email"],
                "email_normalized": cleaned_record["email_normalized"],
                "company": cleaned_record["company"],
                "role_title": cleaned_record["role_title"],
                "bio_notes": cleaned_record["bio_notes"],
                "source": cleaned_record["source"],
                "role_type": cleaned_record.get("role_type"),
                "sector_tags": cleaned_record.get("sector_tags", []),
                "seniority": cleaned_record.get("seniority"),
                "community_fit_tags": cleaned_record.get("community_fit_tags", []),
                "fit_score": cleaned_record.get("fit_score"),
                "fit_score_reasoning": cleaned_record.get("fit_score_reasoning"),
                "ai_classification": cleaned_record.get("ai_classification", {}),
                "ai_enrichment_status": cleaned_record.get("ai_enrichment_status"),
                "ai_model": cleaned_record.get("ai_model"),
                "ai_generated_at": cleaned_record.get("ai_generated_at"),
                "is_incomplete": cleaned_record.get("is_incomplete", False),
                "missing_fields": cleaned_record.get("missing_fields", []),
                "embedding": cleaned_record.get("embedding"),
                "embedding_model": cleaned_record.get("embedding_model"),
                "embedding_text": cleaned_record.get("embedding_text"),
            }
            res = sb_client.table("people").upsert(upsert_payload, on_conflict="source_record_id").execute()
            if res.data:
                db_id = res.data[0]["id"]
        except Exception as e:
            print(f"[SUPABASE UPSERT ERROR] {e}")

    # 7. Find Top Matching Introductions
    top_intros = []
    if cleaned_record.get("embedding") and existing_people:
        candidates = []
        for other in existing_people:
            if other.get("is_duplicate_of") or not other.get("embedding"):
                continue
            comp_a = (cleaned_record.get("company") or "").lower().strip()
            comp_b = (other.get("company") or "").lower().strip()
            if comp_a and comp_b and comp_a == comp_b:
                continue

            sim = cosine_similarity(cleaned_record["embedding"], other["embedding"])
            if sim >= 0.65:
                candidates.append((sim, other))

        candidates.sort(key=lambda x: x[0], reverse=True)
        for sim, other in candidates[:3]:
            try:
                rationale = generate_intro_rationale(cleaned_record, other, sim)
                intro_dict = {
                    "matched_person_name": other["name"],
                    "matched_person_company": other.get("company"),
                    "match_score": round(sim, 4),
                    "match_band": rationale.match_band,
                    "shared_context": rationale.shared_context,
                    "suggested_intro": rationale.suggested_intro,
                    "reasoning": rationale.reasoning,
                }
                top_intros.append(intro_dict)

                # Save intro suggestion to Supabase if DB IDs exist
                if sb_client and db_id and other.get("id"):
                    id_a, id_b = min(db_id, other["id"]), max(db_id, other["id"])
                    intro_payload = {
                        "person_a_id": id_a,
                        "person_b_id": id_b,
                        "match_score": round(sim, 4),
                        "match_band": rationale.match_band,
                        "shared_context": rationale.shared_context,
                        "suggested_intro": rationale.suggested_intro,
                        "reasoning": rationale.reasoning,
                        "status": "pending",
                        "generated_by": "api_webhook",
                    }
                    sb_client.table("introductions").insert(intro_payload).execute()
            except Exception as e:
                print(f"[INTRO MATCH ERROR] {e}")

    return {
        "status": "success",
        "source_record_id": cleaned_record["source_record_id"],
        "name": cleaned_record["name"],
        "company": cleaned_record["company"],
        "role_title": cleaned_record["role_title"],
        "role_type": cleaned_record.get("role_type"),
        "seniority": cleaned_record.get("seniority"),
        "sector_tags": cleaned_record.get("sector_tags", []),
        "community_fit_tags": cleaned_record.get("community_fit_tags", []),
        "fit_score": cleaned_record.get("fit_score"),
        "fit_score_reasoning": cleaned_record.get("fit_score_reasoning"),
        "is_incomplete": cleaned_record.get("is_incomplete"),
        "missing_fields": cleaned_record.get("missing_fields"),
        "top_introductions": top_intros,
    }


def main():
    port = int(os.getenv("PORT", "8000"))
    print(f"Starting Offline CRM Pipeline API on port {port}...")
    uvicorn.run("pipeline.api:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    main()
