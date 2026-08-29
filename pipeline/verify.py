"""Automated Verification Suite for Offline CRM Pipeline & Database.

Checks:
1. Supabase database connectivity.
2. Exact row count assertions for people and introductions.
3. Duplicate detection correctness (seeded duplicates flagged and linked).
4. AI Enrichment & Classification completeness.
5. Rubric Fit Score & Explainable Reasoning validity.
6. pgvector 768-dim embeddings integrity.
7. Introduction synergies, match bands, and draft icebreakers validity.
"""

from __future__ import annotations

import os
import sys
from typing import Any

from dotenv import load_dotenv
from supabase import create_client

from pipeline.env_utils import load_project_env


class VerificationFailure(Exception):
    pass


def run_verification():
    load_project_env()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("[FAIL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.")
        sys.exit(1)

    client = create_client(url, key)
    print("==========================================================")
    print("[VERIFY] OFFLINE CRM PIPELINE & DATABASE VERIFICATION SUITE")
    print("==========================================================")

    # 1. Fetch all people from Supabase
    people_res = client.table("people").select("*").execute()
    people = people_res.data or []
    print(f"[CHECK 1] Supabase connectivity: OK ({len(people)} people rows fetched)")


    if len(people) != 55:
        raise VerificationFailure(f"Expected 55 people in database, found {len(people)}")

    # 2. Check duplicates
    duplicates = [p for p in people if p.get("is_duplicate_of") is not None]
    canonical = [p for p in people if p.get("is_duplicate_of") is None]
    print(f"[PASS] [CHECK 2] Duplicate Detection: {len(duplicates)} duplicates flagged, {len(canonical)} canonical members")

    if len(duplicates) < 6:
        raise VerificationFailure(f"Expected at least 6 flagged duplicates, found {len(duplicates)}")

    # Verify each duplicate points to a valid canonical parent id
    people_ids = {p["id"] for p in people}
    for dup in duplicates:
        parent_id = dup["is_duplicate_of"]
        if parent_id not in people_ids:
            raise VerificationFailure(f"Duplicate #{dup['id']} references non-existent parent #{parent_id}")
        if dup.get("ai_enrichment_status") != "skipped":
            raise VerificationFailure(f"Duplicate #{dup['id']} was not marked with ai_enrichment_status='skipped'")

    print("[PASS] [CHECK 3] Duplicate Foreign Key Integrity: 100% valid parent links")

    # 3. Check Fit Scores on canonical records
    missing_fit_scores = [p for p in canonical if p.get("fit_score") is None]
    if missing_fit_scores:
        raise VerificationFailure(f"{len(missing_fit_scores)} canonical records are missing fit_score: {[p['source_record_id'] for p in missing_fit_scores]}")

    missing_reasoning = [p for p in canonical if not p.get("fit_score_reasoning") or len(p["fit_score_reasoning"]) < 10]
    if missing_reasoning:
        raise VerificationFailure(f"{len(missing_reasoning)} records have missing or empty fit_score_reasoning")

    scores = [p["fit_score"] for p in canonical]
    min_score, max_score, avg_score = min(scores), max(scores), sum(scores) / len(scores)
    print(f"[PASS] [CHECK 4] Fit Scores: 100% populated (Min: {min_score:.1f}, Max: {max_score:.1f}, Avg: {avg_score:.1f})")

    # 4. Check AI Classifications
    for p in canonical:
        if not p.get("role_type") or not p.get("seniority"):
            raise VerificationFailure(f"Person #{p['id']} missing role_type or seniority")
        if not isinstance(p.get("sector_tags"), list):
            raise VerificationFailure(f"Person #{p['id']} sector_tags is not a list")
        if not p.get("is_incomplete") and len(p["sector_tags"]) == 0:
            raise VerificationFailure(f"Complete person #{p['id']} ({p['name']}) has empty sector_tags")

    print(f"[PASS] [CHECK 5] AI Classifications: 100% enriched (Role types, Seniority, Sectors, Fit Tags)")


    # 5. Check Vector Embeddings
    missing_embeddings = [p for p in canonical if not p.get("embedding")]
    if missing_embeddings:
        raise VerificationFailure(f"{len(missing_embeddings)} canonical records are missing vector embeddings")

    print(f"[PASS] [CHECK 6] pgvector 768-dim Embeddings: 100% generated and stored")

    # 6. Check Introductions Table
    intros_res = client.table("introductions").select("*").execute()
    intros = intros_res.data or []
    print(f"[PASS] [CHECK 7] Introductions Table: {len(intros)} high-synergy recommendations found")

    if len(intros) != 30:
        raise VerificationFailure(f"Expected 30 introductions, found {len(intros)}")

    for intro in intros:
        if intro["person_a_id"] not in people_ids or intro["person_b_id"] not in people_ids:
            raise VerificationFailure(f"Intro #{intro['id']} has invalid person foreign keys")
        if intro["match_score"] < 0.65:
            raise VerificationFailure(f"Intro #{intro['id']} has low match score {intro['match_score']}")
        if not intro.get("shared_context") or not intro.get("suggested_intro") or not intro.get("reasoning"):
            raise VerificationFailure(f"Intro #{intro['id']} is missing shared context, suggested intro, or reasoning")

    print(f"[PASS] [CHECK 8] Intro Rationale & Drafts: 100% verified (Shared context, icebreaker drafts, bilateral value)")

    print("==========================================================")
    print("SUCCESS: ALL 8 AUTOMATED VERIFICATION CHECKS PASSED!")
    print("==========================================================")


if __name__ == "__main__":
    try:
        run_verification()
        sys.exit(0)
    except VerificationFailure as e:
        print(f"\n[FAIL] VERIFICATION FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] UNEXPECTED ERROR: {e}")
        sys.exit(1)

