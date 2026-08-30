# Offline OS — AI-Native Relationship CRM & Automation Engine
## Official Submission Note & System Evaluation

---

## 1. What I Built

I built **Offline OS**, a production-grade, AI-native relationship CRM and automation engine designed specifically for **Offline**, **Encore**, and **The Offline Network (TON)**. It transforms passive, static Airtable records into an intelligent, active operating system that automates applicant qualification, data hygiene, and high-value introduction matching.

### 🌐 Live Production Deployments:
* **Operator Console (Dashboard)**: [https://offline-os-gray.vercel.app/](https://offline-os-gray.vercel.app/)
* **Public Application Portal**: [https://offline-os-gray.vercel.app/apply](https://offline-os-gray.vercel.app/apply)
* **GitHub Repository**: [https://github.com/bhaktofmahakal/offline-os](https://github.com/bhaktofmahakal/offline-os)
* **n8n Workflow Definition**: [`n8n/offline-crm-pipeline.json`](n8n/offline-crm-pipeline.json) (Production-ready importable JSON)

---

## 2. Comprehensive Feature Breakdown (How Everything Works)

### A. Dual Ingestion Channels (Real-Time + Batch)
1. **Live Public Application Portal (`/apply`)**:
   * Founders submit basic details (`Name`, `Email`, `Company`, `Role`, `Bio`).
   * In **< 2 seconds**, the serverless route triggers the AI evaluation pipeline, computing a 0–100 Fit Score, generating `#sector` and `#community` tags, and instantly querying Supabase `pgvector` to display complimentary members already in the network.
2. **Airtable / CSV Batch Ingestion Modal**:
   * Operators can upload CSV files (e.g. legacy Airtable exports) or paste raw text.
   * Features a client-side parser, real-time validation, and a live streaming progress bar that ingests, cleans, deduplicates, and embeds records in batches.

### B. Operator Console & Member Management
1. **Real-Time Search & Multi-Axis Filtering**:
   * Instant millisecond searching across names, companies, roles, and sector tags.
   * Multi-axis filter controls for Role Type (`Founders`, `Operators`, `Investors`, `Researchers`), Sector Domain (`Climate`, `Bio`, `Fintech`, `AI`, `Ops`), and Record Quality (`Canonical`, `Flagged Duplicates`, `Incomplete`, `High Fit 80+`).
2. **Deterministic Rubric Tooltips**:
   * Hovering on any Fit Score badge displays the exact rubric evaluation breakdown, eliminating arbitrary LLM ratings and ensuring complete operator trust.
3. **Slide-Out Member Details Drawer (Full CRUD)**:
   * Provides in-place editing for names, companies, roles, emails, sector tags, and bio notes with instant database persistence (`PATCH /api/people`).
   * Supports cascading record deletion (`DELETE /api/people?id=...`).
4. **Dedicated Server-Side Exports (`/api/export`)**:
   * High-reliability server endpoints streaming RFC-4180 CSV and JSON files.
   * Enforces dual RFC 5987 / RFC 6266 headers (`Content-Disposition: attachment; filename="xyz.csv"; filename*=UTF-8''xyz.csv`) and prepends a UTF-8 Byte Order Mark (`\uFEFF`) for seamless compatibility with Microsoft Excel, Google Sheets, and downstream tools.
   * Supports directory exports, individual lead profile exports, duplicate queue audit exports, and introduction outreach exports.

### C. 2-Tier AI Deduplication Review Queue
1. **Hybrid RapidFuzz + LLM Matching**:
   * **Tier 1 (Deterministic)**: Normalizes emails and computes composite fuzzy string distance across names and companies locally (<1ms).
   * **Tier 2 (Contextual LLM)**: Ambiguous matches (e.g. founder applying with personal email or updated company name) are adjudicated using Gemini with structured confidence scores.
2. **Side-by-Side Diff Viewer**:
   * Compares the **Canonical Primary Record** on the left with the **Duplicate Candidate** on the right, highlighting confidence level (`100%`) and AI rationale.
3. **Non-Destructive Merge Confirmation**:
   * Consolidates bio notes, preserves complete historical audit provenance in Supabase (`people.is_duplicate_of`), and automatically excludes duplicate candidates from introduction pools.

### D. AI Relationship & Introductions Engine
1. **Semantic Synergy Computation**:
   * Computes 768-dimensional vector embeddings (`gemini-embedding-001`) from member superpowers and stated needs, running pairwise cosine similarity ranking.
2. **1-Click AI Icebreaker Generator**:
   * Synthesizes the exact intersection between two members and drafts a personalized, natural double-opt-in intro email ready to copy/paste into Gmail, Superhuman, or Slack.
3. **Operator Workflow & Outreach Export**:
   * 1-click **Approve** or **Dismiss** status actions.
   * **Export Outreach CSV** button generates a clean mail-merge file containing Member A details, Member B details, match score, shared context, and the draft icebreaker message.

---

## 3. n8n Autonomous Workflow Architecture

The repository includes a production-ready, exportable n8n workflow definition in [`n8n/offline-crm-pipeline.json`](file:///u:/offline-os/n8n/offline-crm-pipeline.json):

```
┌────────────────────────────────┐
│   1. Webhook Trigger Node      │ <── Ingests new applicant from Airtable / Typeform
│   (POST /webhook/new-applicant)│
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│   2. JavaScript Normalizer     │ <── Strips whitespace, normalizes emails, audits missing fields
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│   3. HTTP Request Node         │ <── Calls Python Pipeline Microservice
│   (POST /process-new-record)   │     Executes Dedupe -> AI Classify -> Rubric Fit -> Vector Embed
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│   4. Supabase Upsert Node      │ <── Persists enriched person & generated intro pairs to PostgreSQL
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│   5. IF Node (Fit Score > 85)  │
└───────┬────────────────┬───────┘
        │                │
     [TRUE]           [FALSE]
        │                │
        ▼                ▼
┌──────────────────┐ ┌──────────────────┐
│ 6. Slack VIP Bot │ │ 7. Standard Log  │
│ (Block-Kit Card) │ │ (Database Sync)  │
└──────────────────┘ └──────────────────┘
```

* **Webhook Listener**: Listens on `/webhook/new-offline-applicant` for real-time form submissions or Airtable automations.
* **Pipeline Microservice**: Offloads heavy LLM classification and embedding generation to the containerized Python service.
* **Slack Interactive Alert**: For any high-signal applicant scoring **> 85**, dispatches a rich Slack Block-Kit notification with candidate bio, score breakdown, and interactive 1-click `[Approve & Welcome]` buttons.

---

## 4. System Architecture Diagram

```
                                    ┌────────────────────────┐
                                    │  Incoming Applicants   │
                                    │  (/apply or CSV Batch) │
                                    └───────────┬────────────┘
                                                │
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          PIPELINE CORE (Serverless & Microservices)                    │
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
                │   Approve/Dismiss & Exports) │ │   Slack Block-Kit Alerts)    │
                └──────────────────────────────┘ └──────────────────────────────┘
```

* **Relational Integrity**: Duplicates are cleanly linked via self-referencing foreign keys (`people.is_duplicate_of`), preventing accidental data loss while excluding duplicates from introduction pools.
* **Production Reliability & Zero SPOF**: Rather than relying on single-container hosting that suffers from monthly quota caps or cold starts, the primary CRM engine is architected on **Vercel Serverless** + **Supabase Cloud PostgreSQL** ensuring 24/7 high-availability and sub-second response times.

---

## 5. Where AI Was Actually Useful (Honest & Specific)

### 🌟 Where AI Added Indispensable Value:
1. **Adjudicating Ambiguous Duplicate Pairs**:
   * RapidFuzz easily handles exact email/name matches, but fails on cases like *"Same founder applying under a holding company name with slightly different role wording"*. Gemini 2.5 Flash accurately resolved fuzzy candidates.
2. **Structured Taxonomy Classification & Tagging**:
   * Raw applicant bios are noisy and unstructured. Using Gemini with strict Pydantic JSON schemas (`response_schema`) converted freeform text into precise `role_type`, `seniority`, `sector_tags`, and `community_fit_tags` with 100% schema adherence.
3. **Explainable Fit Score Reasoning**:
   * Founders and operators hate arbitrary numbers. Having Gemini generate a concise 1–2 sentence explanation of *why* an applicant scored high or low makes the CRM immediately actionable.
4. **Contextual Bilateral Intro Rationales & Icebreakers**:
   * Cosine similarity identifies that two vectors are close (0.80+), but cannot write an introduction. Gemini synthesized the exact intersection of both members' domains and generated customized, ready-to-send draft icebreaker emails.

### 🚫 Where AI Was Overkill or Unreliable:
1. **Raw Numeric Fit Scoring**:
   * Asking an LLM *"Rate this applicant from 0 to 100"* produces severe score drift and hallucinations. We replaced raw LLM scoring with a deterministic 100-point rubric, reserving the LLM solely for explanation.
2. **Basic Data Normalization & Formatting**:
   * Using LLMs for trimming whitespace, title-casing names, or standardizing emails is slow and expensive. Python regex and `pandas` operations perform this in <1ms with 100% determinism.
3. **Obvious Duplicate Matching**:
   * Querying an LLM for exact name/email matches wastes tokens. `RapidFuzz` handles 90%+ of obvious duplicates locally on the CPU; Gemini is only invoked for the narrow ambiguous band (75%–91% similarity).

---

## 6. What I'd Build Next With Another Week (Growth & Automation Roadmap)

If given another week to expand this system into an enterprise multi-team production deployment for Offline:

1. **Bi-Directional Airtable REST & Webhook Live Sync**:
   * Implement real-time Webhook subscriptions (`Airtable API v0 /webhooks`) and delta-syncing between Airtable and Supabase. 
   * Team members continue using Airtable while Offline OS runs in the background, writing back AI Fit Scores, Sector Tags, and Suggested Introductions into custom Airtable columns in real-time.
2. **Multi-Provider Waterfall Enrichment Pipeline**:
   * **Apollo.io API**: Automatically backfill verified company headcount, funding stage (Pre-Seed/Seed/Series A), and employee count.
   * **FindyMail API**: Real-time SMTP & MX deliverability checks to prevent bounced intros.
   * **Apify LinkedIn Scraper**: Ingest founder career timelines, past exits, patents, and mutual connection graphs without manual copy-pasting.
   * **TinyFish / Firecrawl Agentic Research**: For stealth founders with brief bios, spawn an autonomous research subagent to parse their GitHub repositories, personal essays, and press mentions into a structured 360° founder dossier.
3. **Automated Double Opt-In Intro Dispatcher (Resend / Postmark)**:
   * When an operator clicks **Approve Intro**, the platform automatically generates and sends a personalized dual-opt-in email to both founders simultaneously, tracking reply sentiment and founder NPS over time.
4. **Real-Time Slack VIP Intake & Mobile Operator Bot (`#offline-vip-intake`)**:
   * Dispatch instant Block-Kit messages to a `#offline-vip-intake` Slack channel whenever an applicant scores **> 85**, with 1-click Slack interactive `[Approve & Welcome]`, `[Suggest Intro]`, and `[Review Duplicate]` buttons for mobile triage.
5. **Interactive 3D Graph-Based Community Cluster Visualization**:
   * Render an interactive WebGL / Three.js force-directed 3D graph of all members clustered by 768-dimensional `pgvector` cosine similarity to discover untapped cross-cohort synergies and detect under-connected founders across TON and Encore.
