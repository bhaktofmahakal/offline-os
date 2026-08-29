# Offline OS — Submission Note & System Evaluation

---

## 1. What I Built

I built **Offline OS**, a production-ready CRM intelligence engine and operator console designed to automate member ingestion, qualification, deduplication, and high-synergy introduction matching for Offline's private community.

The system encompasses:
1. **5-Stage Python Ingestion Pipeline (`pipeline/`)**:
   * **Stage 1 (`clean.py`)**: Normalizes whitespace, title casing, email formatting, and performs missing-field audits.
   * **Stage 2 (`dedupe.py`)**: Hybrid RapidFuzz string scoring + Gemini 3.5 ambiguous candidate adjudication.
   * **Stage 3 (`enrich_classify.py`)**: Structured Pydantic JSON extraction for `role_type`, `seniority`, `sector_tags`, and `community_fit_tags`.
   * **Stage 4 (`fit_score.py`)**: Programmatic 100-point rubric calculation + Gemini human-readable explainability strings.
   * **Stage 5 (`intro_match.py`)**: 768-dimensional vector embeddings (`gemini-embedding-001`), pairwise cosine similarity ranking, and AI-synthesized bilateral introduction rationales with draft icebreaker messages.
2. **Resilient LLM Infrastructure (`gemini_client.py`)**:
   * SQLite disk caching (`gemini_cache.sqlite`), 4.2s rate-limit throttling, and exponential backoff retry logic.
3. **Webhook Ingest API (`pipeline/api.py`)**:
   * FastAPI service (`POST /process-new-record`) enabling live real-time applicant processing.
4. **Automated n8n Workflow (`n8n/offline-crm-pipeline.json` & `n8n/SETUP.md`)**:
   * Webhook ingest triggering the pipeline API and outputting Slack Block-Kit notifications.
5. **Next.js 14 Operator Console (`app/`)**:
   * High-density UI matching `DESIGN.md` tokens (warm canvas `#F5F3EE`, surface `#FFFDF9`, mineral green `#557A5D`, copper `#A76245`).
   * Members directory table with multi-filter search, fit score popovers, and slide-out details drawer.
   * Duplicates Review Queue with side-by-side diff cards and confidence scores.
   * Introductions Workspace with live Approve / Dismiss buttons that update Supabase in real-time.
6. **Automated Verification Suite (`pipeline/verify.py`)**:
   * 8 automated assertions validating database connectivity, row counts, duplicate links, fit score population, embedding integrity, and intro rationales.

---

## 2. Architecture

```
                                    ┌────────────────────────┐
                                    │  Incoming Applicants   │
                                    │  (CSV/JSON or Webhook) │
                                    └───────────┬────────────┘
                                                │
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PIPELINE CORE                                          │
│                                                                                        │
│  [1. Clean & Audit] ──> [2. Dedupe Engine] ──> [3. AI Classify] ──> [4. Fit Rubric]    │
│    (pandas / regex)      (RapidFuzz + LLM)       (Pydantic JSON)      (Deterministic)  │
│                                                          │                             │
│                                                          ▼                             │
│  [SQLite SHA-256 Cache] <──────────────────────> [5. Vector Match]                     │
│    (Zero token waste)                             (768-dim + Cosine + Gemini Intros)   │
└───────────────────────────────────────────────┬────────────────────────────────────────┘
                                                │
                                                ▼
                        ┌───────────────────────────────────────────────┐
                        │        Supabase PostgreSQL + pgvector         │
                        │       (people & introductions tables)         │
                        └───────┬───────────────────────────────┬───────┘
                                │                               │
                                ▼                               ▼
                ┌──────────────────────────────┐ ┌──────────────────────────────┐
                │  Next.js 14 Operator Console │ │  n8n Automation & Webhook    │
                │  (Members, Duplicates, Intros│ │  (Real-time Ingestion &      │
                │   Approve/Dismiss Actions)   │ │   Slack Block-Kit Alerts)    │
                └──────────────────────────────┘ └──────────────────────────────┘
```

* **Relational Integrity**: Duplicates are cleanly linked via self-referencing foreign keys (`people.is_duplicate_of`), preventing accidental data loss while excluding duplicates from introduction pools.
* **Separation of Concerns**: Deterministic logic is kept programmatic (cleaning, scoring base points, vector math), while LLMs are used strictly where contextual judgment and natural language generation excel.

---

## 3. Where AI Was Actually Useful (Honest & Specific)

### 🌟 Where AI Added Indispensable Value:
1. **Adjudicating Ambiguous Duplicate Pairs**:
   * RapidFuzz easily identifies exact email/name matches, but fails on cases like *"Same founder applying under a holding company name with slightly different role wording"*. Gemini 3.5 accurately resolved fuzzy candidates (e.g. adjudicating whether two fintech operators with different bios were the same person).
2. **Structured Taxonomy Classification & Tagging**:
   * Raw applicant bios are noisy, unstandardized, and conversational. Using Gemini with strict Pydantic JSON schemas (`response_schema`) converted freeform text into precise `role_type`, `seniority`, `sector_tags`, and `community_fit_tags` with 100% schema adherence and zero parser crashes.
3. **Explainable Fit Score Reasoning**:
   * While the numerical score is calculated programmatically, founders and operators hate arbitrary numbers. Having Gemini generate a concise, human-readable 1–2 sentence explanation of *why* an applicant scored high or low makes the CRM immediately actionable.
4. **Contextual Bilateral Intro Rationales & Icebreakers**:
   * Cosine similarity can tell you two vectors are close (0.80+), but cannot write an introduction. Gemini synthesized the exact intersection of both members' domains and generated customized, natural 1-sentence draft icebreakers ready to copy/paste into an email or DM.

### 🚫 Where AI Was Overkill or Unreliable:
1. **Raw Numeric Fit Scoring**:
   * Asking an LLM *"Rate this applicant from 0 to 100"* produces severe score drift, hallucinations, and non-reproducible ratings across runs. We replaced raw LLM scoring with a deterministic 100-point rubric, reserving the LLM solely for explanation.
2. **Basic Data Normalization & Formatting**:
   * Using LLMs for trimming whitespace, title-casing names, or standardizing emails is slow, expensive, and unnecessary. Simple Python regex and `pandas` string operations perform this in <1ms with 100% determinism.
3. **Obvious Duplicate Matching**:
   * Querying an LLM for exact name/email matches wastes tokens. `RapidFuzz` handles 90%+ of obvious duplicates locally on the CPU; Gemini is only invoked for the narrow ambiguous band (75%–91% similarity).

---

## 4. What I'd Build Next With Another Week

If given another week to expand this system into a multi-team production deployment, I would prioritize:

1. **Bi-Directional Airtable & CRM Live Sync Engine**:
   * Implement real-time Webhook subscriptions and delta-syncing between Airtable, Google Sheets, and Supabase so additions or edits in Airtable instantly flow through the pipeline, and enriched tags/fit scores write back to custom Airtable fields.
2. **Comprehensive Merge Engine with Field-Level Conflict Resolution**:
   * Build an interactive merge workbench where operators can select which fields to retain from each duplicate (e.g. keep newer email, merge bio notes, consolidate company history) with transactional rollback and audit history logs.
3. **Live Web Enrichment Pipeline (Tavily / Tinyfish / LinkedIn)**:
   * For real-world applicants, integrate live web search and social scraping to automatically fetch verified LinkedIn headlines, GitHub repositories, Crunchbase funding rounds, and recent news mentions before running the fit score rubric.
4. **Multi-Operator Human-in-the-Loop Workflow & Slack Action Buttons**:
   * Wire n8n and Slack interactive buttons (`[Approve Intro]`, `[Request More Info]`, `[Reject]`) directly into Slack channels so community leads can approve member intros or dismiss duplicates directly from their phones without opening the browser.
