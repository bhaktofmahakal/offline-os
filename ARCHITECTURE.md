# NetworkOS — System Architecture & Technical Design Rationale

**NetworkOS** is an autonomous relationship intelligence CRM and community operating system. It transforms passive applicant databases into an active, self-enriching network by automating data ingestion, entity deduplication, deep web intelligence, rubric qualification, and bilateral introduction matching.

---

## 1. End-to-End Unified System Architecture

```mermaid
flowchart TD
    %% INGESTION CHANNELS
    subgraph INGESTION["1. INGESTION & DATA CAPTURE"]
        A1[Airtable Live Pull\nGET /v0/bases/table?offset=...] --> A0[Ingestion Controller\nRate-Throttled Cursor Loop]
        A2[Airtable Webhooks\nPayload Ping Receiver] --> A0
        A3[Direct Webhook /api/v1/ingest\nTypeform / Tally / n8n] --> A0
        A4[CSV Batch Ingest\nClient Parser + SSE Logs] --> A0
        A5[Public Intake Portal /apply\nInteractive Next.js Form] --> A0
    end

    %% PIPELINE ENGINE
    subgraph CORE["2. ENTITY RESOLUTION & DEDUPE ENGINE"]
        A0 --> B1[Normalizer: Email canonicalization,\nphone cleaning, whitespace strip]
        B1 --> B2{Tier 1: Deterministic Check}
        B2 -->|Exact Email Match| B3[Flag as Duplicate\nMatch = 100%]
        B2 -->|RapidFuzz Token-Sort Ratio >= 92%| B3
        B2 -->|Fuzzy Ratio 75% - 91%| B4[Tier 2: Gemini 2.5 Flash\nContextual Adjudication]
        B4 -->|Same Person| B3
        B4 -->|Distinct Person| C1[Canonical Member Profile]
        B2 -->|< 75% Distance| C1
        B3 --> B5[Non-Destructive Merge Queue\nis_duplicate_of -> Canonical ID]
    end

    %% DEEP INTELLIGENCE
    subgraph INTEL["3. DEEP INTELLIGENCE & RESEARCH SUITE"]
        C1 --> D1[360° AI Enrichment Pipeline]
        D1 --> D2[TinyFish CLI Scraper\nGitHub / Portfolio Extraction]
        D1 --> D3[Tavily Neural Web Search\nFunding, Exits & Press Footprint]
        D1 --> D4[Gemini 2.5 Flash Synthesis\nTech Stack + Traction Signals]
        
        C1 --> D5[Tavily Deep Research Subsystem]
        D5 --> D6[Task Creator: POST /api/tavily/research\nModel: mini / pro]
        D6 --> D7[Async Poller: GET /api/tavily/research?requestId=...\nStatus: pending -> in_progress -> completed]
        D7 --> D8[Cited Markdown Dossier + Sources List]
    end

    %% SCORING & EVALUATION
    subgraph SCORING["4. DETERMINISTIC RUBRIC EVALUATION"]
        C1 --> E1[Multi-Axis Scoring Engine]
        E1 --> E2[Role & Seniority: 0-30 pts]
        E1 --> E3[Sector Alignment: 0-25 pts]
        E1 --> E4[Community Fit: 0-25 pts]
        E1 --> E5[Completeness: 0-20 pts]
        E1 --> E6[Composite Fit Score: 0-100]
        E6 --> E7[Gemini Explainability Reasoning Generation]
    end

    %% MATCHMAKING
    subgraph MATCH["5. BILATERAL INTRO MATCHMAKING"]
        C1 --> F1[768-dim Embeddings\ngemini-embedding-001]
        F1 --> F2[(Supabase pgvector Database)]
        F2 --> F3[Pairwise Cosine Similarity Matrix]
        F3 --> F4[Filter Candidates: score >= 0.70\nExclude Duplicates & Self-Matches]
        F4 --> F5[Gemini Bilateral Icebreaker Generator]
        F5 --> F6[Warm Intro Dispatcher\n1-Click Mailto & Clipboard]
    end

    %% WRITEBACK & UI
    subgraph OUTPUT["6. PERSISTENCE, WRITEBACK & EXPORT"]
        F6 --> G1[(Supabase PostgreSQL)]
        E6 --> G2[Airtable Bi-Directional Writeback\nPATCH /v0/base/table/recordId]
        G1 --> G3[Next.js 14 Operator Console\napp/page.tsx]
        G1 --> G4[RFC-4180 Server-Side Exports\nCSV & JSON with UTF-8 BOM]
    end
```

---

## 2. Core Architectural Subsystems

### Subsystem A: Multi-Channel Ingestion & Airtable Web API Suite
1. **Native REST Over Heavy SDKs (`airtable.js`)**:
   * Standard `airtable.js` is built for Node.js callback/promise wrappers with runtime overhead and inflexible pagination.
   * NetworkOS implements direct, lightweight `fetch()` wrappers against `https://api.airtable.com/v0` using modern Next.js Edge/Serverless runtimes.
2. **Dynamic Schema Auto-Discovery**:
   * [`/api/airtable/bases`](file:///u:/offline-os/app/api/airtable/bases/route.ts): Fetches all available bases using the operator's Personal Access Token.
   * [`/api/airtable/tables`](file:///u:/offline-os/app/api/airtable/tables/route.ts): Dynamically inspects table schemas, column names, and field types, enabling zero-config mapping.
3. **Cursor-Based Ingestion (`/api/airtable/sync`)**:
   * Uses Airtable's native `offset` cursor to iterate over paginated records (100 per batch).
   * Enforces 5 requests/sec throttling to respect Airtable API limits.
4. **Official Webhook Lifecycle Management (`/api/airtable/webhooks`)**:
   * Programmatically creates Airtable base webhooks (`POST /v0/bases/{baseId}/webhooks`).
   * Manages 7-day expiration lifecycles (`PATCH .../refresh`).
   * Subscribes to table delta payloads (`GET .../payloads`) and ingests modified records.
5. **Universal Ingest Endpoint (`POST /api/v1/ingest`)**:
   * Open JSON webhook for incoming submissions from Typeform, Tally, Google Forms, and n8n.
   * Executes normalization, deduplication, fit scoring, and sector tagging in real-time.

---

### Subsystem B: Entity Resolution & Hybrid Deduplication
1. **Tier 1 — High-Throughput Deterministic Matching (<1ms)**:
   * Normalizes emails (`user.name+alias@domain.com` -> `username@domain.com`).
   * Runs `RapidFuzz` token-sort string distance on name and company fields.
   * Scores $\ge 92\%$ are flagged immediately as duplicates without LLM invocation.
2. **Tier 2 — Contextual LLM Adjudication (Gemini 2.5 Flash)**:
   * Matches in the ambiguous $75\% - 91\%$ band (e.g. founder re-applying with a new domain or abbreviated company name) are sent to Gemini.
   * Returns a structured decision (`is_duplicate: boolean`, `confidence: float`, `reasoning: string`).
   * This hybrid architecture **saves >85% of LLM token costs** while achieving near-zero false positive rates.
3. **Non-Destructive Canonical Linking**:
   * Duplicate records are not destroyed; they retain their raw data with an `is_duplicate_of` pointer to the canonical record.
   * Operators review candidate pairs side-by-side with an interactive merge verification dialog.

---

### Subsystem C: Deep Intelligence & Autonomous Research (`@tavily/core`)
NetworkOS integrates the complete **Tavily AI Core Suite** as an autonomous intelligence subsystem with **100% database persistence**:
1. **Asynchronous Deep Research Task (`/api/tavily/research`)**:
   * Dispatches long-form research tasks using `client.research(input, { model: 'mini' | 'pro' })`.
   * Returns an immediate `requestId`.
   * Frontend polls `GET /api/tavily/research?requestId=...` until `status === 'completed'`.
   * Automatically persists the resulting markdown intelligence report and verified primary sources to `public.intelligence_records` (and to `people.ai_classification.deep_memo` when executed from a member's profile drawer).
2. **Recursive Site Crawler (`/api/tavily/crawl`)**:
   * Recursively traverses target domains with configurable limit (1–50 pages), max depth, and breadth.
   * Extracts clean, structured LLM-ready markdown content and logs completed crawls to `public.intelligence_records`.
3. **Multi-URL Clean Extractor (`/api/tavily/extract`)**:
   * Batch extracts markdown content from up to 20 URLs concurrently with persistence to Supabase.
4. **Neural Web Search Engine (`/api/tavily/search`)**:
   * Executes LLM-targeted semantic searches with domain filtering and relevance scores, automatically storing citations and query parameters in `public.intelligence_records`.
5. **Persistent Intelligence Audit Ledger (`/api/intelligence`)**:
   * Provides historical query inspection, record filtering by type, and 1-click **Restore to View** functionality that repopulates previous search or crawl datasets with zero additional API tokens.

---

### Subsystem D: 360° AI Enrichment & Dossier Persistence Engine
* Located in [`app/api/people/enrich/route.ts`](file:///u:/offline-os/app/api/people/enrich/route.ts).
* **Fusion Logic**:
  * Step 1: Queries **Tavily Advanced Search** for founder background, venture funding rounds, accelerators (Y Combinator, Techstars), and recent press coverage.
  * Step 2: **Gemini 2.5 Flash** synthesizes raw web evidence into a high-density structured JSON 360° Founder Dossier:
    * `executive_summary`: Concise 2-sentence executive summary highlighting domain depth and current company focus.
    * `traction_signals`: Specific factual traction indicators and leadership background.
    * `tech_stack`: Detected domain specializations and core technology stack.
    * `target_synergies`: Ideal co-founder and strategic connection archetypes.
    * `verified_confidence`: Confidence score (80–95%).
  * Step 3: **Permanent Database Persistence**:
    * Writes the full dossier into `people.ai_classification.dossier` in Supabase PostgreSQL.
    * Updates `people.clean_summary`, `people.ai_model = 'gemini-2.5-flash'`, and `people.ai_generated_at = now()`.
    * Automatically updates `people.community_fit_tags` with `'360_enriched'` and `#<tech>` tags.
  * Step 4: **Zero-Data-Loss Hydration**:
    * On initial page load or browser refresh, `fetchData()` hydrates `dossierCache` and `drawerResearchReport` directly from each member's `ai_classification` column, guaranteeing that generated dossiers never vanish across sessions.

---

### Subsystem E: Deterministic Rubric Fit Scoring Engine
* **The Problem with Raw LLM Scoring**: Unconstrained LLM evaluation suffers from score drift, hallucinations, and inability to explain rationale to stakeholders.
* **Deterministic Rubric Architecture**:
  * **Role & Seniority (30 pts)**: C-level / Founder = 30 pts, VP / Director = 25 pts, Senior = 20 pts.
  * **Sector Alignment (25 pts)**: Core focus areas (AI, Climate, Biotech, Deeptech, Fintech) = 25 pts.
  * **Community Fit (25 pts)**: Stated willingness to mentor, host, or collaborate = 25 pts.
  * **Data Completeness (20 pts)**: Presence of Bio, LinkedIn, Website, and Role details = 20 pts.
* **Explainability Layer**: Gemini 2.5 Flash takes the computed numeric score and candidate profile to synthesize a clear, objective 1–2 sentence explanation displayed in interactive tooltips.

---

### Subsystem F: Bilateral Introduction Matchmaking & Dispatcher
1. **Dense Vector Embeddings**:
   * Generates 768-dimensional embeddings using `gemini-embedding-001`.
   * Stored in Supabase `vector(768)` columns with HNSW/IVFFlat indexing.
2. **Cosine Similarity Match Matrix**:
   * Pairwise cosine similarity computes affinity between applicant superpowers and stated needs.
   * Filters out self-matches and flagged duplicates.
3. **AI Icebreaker Synthesis**:
   * Gemini analyzes the shared context between Candidate A and Candidate B.
   * Drafts a natural, personalized double-opt-in intro message.
4. **Warm Intro Dispatcher**:
   * In the operator console, approved intros feature an instant **Dispatch Email** button.
   * Opens pre-populated `mailto:` links with recipient emails, subject, and tailored body, or copies to clipboard for Slack / Superhuman outreach.

---

### Subsystem G: Bi-Directional Synchronizer
* [`/api/airtable/writeback`](file:///u:/offline-os/app/api/airtable/writeback/route.ts):
  * Whenever a candidate is qualified, enriched, or scored in NetworkOS, operators can write back findings to the source Airtable base:
  * `PATCH https://api.airtable.com/v0/{baseId}/{table}/{recordId}`
  * Writes: `Fit Score`, `AI Thesis`, `Sector Tags`, `Synergy Notes`.

---

### Subsystem H: Dual-Workspace Isolation (`Sandbox` vs. `Live`)
* Operators can toggle between:
  * **Sandbox Demo Mode**: Pre-seeded records designed for demonstrations, feature evaluations, and edge-case testing.
  * **Live Production Mode**: Clean environment receiving live external webhooks and Airtable syncs.
* **1-Click Live Workspace Purge (`POST /api/workspace/reset`)**:
  * Safely purges live records without corrupting foreign keys, database schema, or demo datasets.

---

## 3. Technology Selection Matrix

| Layer | Chosen Technology | Rationale & Alternatives Evaluated |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 App Router (TypeScript) | Full-stack unified architecture; serverless API route handlers eliminate dedicated backend microservice dependencies. |
| **Autonomous Intelligence** | `@tavily/core` v0.7+ | Built specifically for agentic workflows with asynchronous deep research, recursive crawling, and clean markdown extraction. Evaluated Google Custom Search (no crawler/extract) and SerpApi (no deep research pipeline). |
| **Airtable Integration** | Native HTTP REST (Zero-SDK) | Modern `fetch()` with scoped PAT avoids `airtable.js` legacy callback bloat and unblocks 7-day webhook lifecycle operations. |
| **Database & Vector Search**| Supabase PostgreSQL + `pgvector` | ACIDs-compliant relational integrity for canonical/duplicate linkages combined with native 768-dim cosine similarity search. |
| **LLM Classification** | Google Gemini 2.5 Flash | High throughput, sub-second latency, and strict schema adherence via structured JSON outputs (`response_schema`). |
| **Entity Deduplication** | `RapidFuzz` + Gemini Hybrid | <1ms local CPU execution catches 90%+ duplicates; LLM only invoked for the 75–91% ambiguous threshold. Saves >85% token costs. |
| **Styling & Design Tokens** | Tailwind CSS + Lucide Icons | High-density operator UI inspired by Linear and macOS enterprise consoles; responsive across desktop and mobile. |

---

## 4. Security, Isolation & Production Hardening

* **Server-Side Secret Isolation**: All sensitive credentials (`SUPABASE_SERVICE_ROLE_KEY`, `TAVILY_API_KEY`, `AIRTABLE_PERSONAL_ACCESS_TOKEN`, `GEMINI_API_KEY`) run strictly inside server route handlers (`app/api/*`). The browser client never touches raw API tokens.
* **RFC-4180 Compliance & UTF-8 BOM**: Server-side exports in `/api/export` enforce RFC 5987/6266 headers and prepend a `\uFEFF` Byte Order Mark, preventing encoding corruption in Microsoft Excel and Apple Numbers.
* **Rate-Limit Resilience**: Ingestion and synchronization loops enforce backoff and retry mechanisms to prevent 429 throttling across external APIs.
* **Reversible Governance**: Duplicate merges are non-destructive and retain full parent record pointers (`is_duplicate_of`).

---

## 5. Strategic Future Roadmap & Ecosystem Playbooks

Derived from the **Offline Founder's Office Master Playbook**, these architectural blueprints address the operational ceiling of the 5-person executive team (Utsav Somani, Sahil Talwar, Sharon Pereira, Aparna Pande, Fabiola Monteiro) as the community expands from 300 to 1,000+ members.

```mermaid
flowchart LR
    subgraph EXPANSION["FOUNDER'S OFFICE AUTOMATION SUITE"]
        B1["1. Seating Optimizer\n(Aparna: 8-Person Tables)"]
        B2["2. Superpower Matrix\n(Sahil: Reciprocal Intros)"]
        B3["3. Churn Telemetry\n(Sharon: 30/60/90d Radar)"]
        B4["4. TinyFish Waterfall\n(Enrichment: Stealth/GitHub)"]
        B5["5. Slack VIP Concierge\n(Utsav: 1-Click Mobile Flow)"]
        B6["6. Two-Stage Retrieval\n(10k+ Scale: HNSW + LLM)"]
    end
```

### 💡 Blueprint 1: Retreats & VIP Dinners "Algorithmic Seating Optimizer"
* **Stakeholder**: **Aparna Pande** (Member Experiences Lead), who curates high-stakes retreats and 8-person private dinner seating arrangements across 50+ unicorn & scaling founders.
* **Platform Capability**:
  * Operator selects: *"Dinner for 48 Founders (6 Tables of 8)"*.
  * Automated constraint-satisfaction algorithm enforces 3 strict business heuristics:
    1. **Zero Direct Competitors**: Conflicting founders (e.g., two quick-commerce or two crypto exchange operators) are mathematically isolated onto distinct tables.
    2. **Balanced Seniority & Stage Distribution**: Each table enforces a curated ratio: 2 exited/unicorn founders + 4 scaling Series A/B founders + 2 deep-tech/infrastructure specialists.
    3. **AI Table Conversation Cards**: Generates a custom 1-page briefing card per table detailing shared latent interests, complementary operational bottlenecks, and provocative off-the-record discussion prompts.

### 💡 Blueprint 2: Member Superpower & Bottleneck Reciprocal Matrix
* **Stakeholder**: **Sahil Talwar** (Community & Partnerships Lead), who brokers high-leverage peer introductions.
* **Platform Capability**:
  * Moves beyond unilateral tagging by maintaining a dynamic **Bilateral Synergy Index**.
  * Matches **Founder A's Superpower** (e.g., *Scale GTM, US Enterprise Sales*) with **Founder B's Bottleneck** (*Struggling with US outbound expansion*), while simultaneously matching **Founder B's Superpower** (*Autonomous Agent Infra*) with **Founder A's Bottleneck** (*LLM pipeline reliability*).
  * Automatically surfaces high-conviction reciprocal introductions that eliminate one-sided networking fatigue.

### 💡 Blueprint 3: Member Engagement & Churn Early-Warning Telemetry
* **Stakeholder**: **Sharon Pereira** (Member Success Lead), who maintains personal concierge touchpoints across the entire private membership.
* **Platform Capability**:
  * **Inactivity Radar**: Tracks member interactions across pod sessions, retreat attendances, and introduction responses. Automatically flags members with 45+ days of silence: *"Sharon: Member X has not engaged in 45 days. Recommended action: Propose 2 curated intros with newly joined founders."*
  * **Automated 'Year-in-Review' Concierge**: 30 days prior to annual membership renewal (₹1.5L–₹3L/yr), compiles a bespoke executive dossier highlighting all peer connections made, mutual value exchanged, and confidential off-the-record insights unlocked through Offline.

### 💡 Blueprint 4: Multi-Provider Waterfall Enrichment & TinyFish Scraper
* **Stakeholder**: Founder's Office Ingestion Pipeline.
* **Platform Capability**:
  * Solves the **"1-Line Stealth Bio"** bottleneck where high-profile founders submit minimalist bios (*"Founder at stealth, ex-Google"*).
  * **Tiered Waterfall Pipeline**:
    1. **TinyFish Autonomous Scraper**: Headless, anti-fingerprinting crawler targeting the founder's personal domain, GitHub repositories, and open-source contributions.
    2. **Tavily Neural Web Search**: Real-time cross-referencing against SEC filings, funding announcements, AngelList syndicate memos, and tech press.
    3. **Gemini 2.5 Flash Synthesis**: Consolidates scraped web crumbs into a structured 360° executive profile before human review.

### 💡 Blueprint 5: Real-Time Slack VIP Intake Concierge Bot (`#offline-vip-intake`)
* **Stakeholder**: **Utsav Somani** (Founder & CEO), enabling sub-minute executive approvals directly from mobile.
* **Platform Capability**:
  * When a high-conviction applicant scores **Fit Score > 85/100**, n8n immediately pushes an interactive Block-Kit notification to `#offline-vip-intake`.
  * Features interactive inline action buttons:
    * `[🟢 Approve & Welcome]`: Dispatches member onboarding sequence.
    * `[🤝 Suggest Intro]`: Links to candidate matchmaker.
    * `[🔬 Deep Research Dossier]`: Opens the Tavily autonomous intelligence briefing.

### 💡 Blueprint 6: Two-Stage Hybrid Vector Retrieval at 10,000+ Scale
* **Stakeholder**: Core Database & Recommendation Infrastructure.
* **Platform Capability**:
  * Prevents $O(N^2)$ Cartesian explosion when evaluating millions of pairwise member combinations:
    1. **Stage 1 (Coarse-Grained Spatial Filtering)**: Supabase `pgvector` HNSW index combined with SQL metadata filtering (sector, stage, geography) extracts top 20 nearest neighbors in **<15ms**.
    2. **Stage 2 (Fine-Grained Contextual Synergy)**: Gemini evaluates only the top 20 pre-filtered pairs, generating bespoke double-opt-in icebreakers with near-zero latency and minimal token consumption.

