# Offline OS — AI-Powered Operator CRM & Member Intelligence

A production-grade, automated CRM intelligence engine and operator console built for **Offline** — evaluating member fit, adjudicating duplicate applications, generating 768-dimensional semantic embeddings, and synthesizing bilateral introduction matches with draft icebreakers.

---

## ⚡ Quickstart (0 to 1 Setup)

### 1. Prerequisites
* **Node.js** v18+ and **npm** v9+
* **Python** 3.10+
* **Supabase Account** (PostgreSQL with `pgcrypto` and `pgvector` enabled)
* **Google Gemini API Key** (`AIza...`)

---

### 2. Clone & Environment Setup

```bash
# 1. Clone repository and navigate to workspace
git clone <repo-url> offline-os
cd offline-os

# 2. Configure environment variables
cp .env.example .env
```

Edit your `.env` file with your credentials:
```ini
# Supabase Configuration
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Gemini AI Key
GEMINI_API_KEY=AIzaSy...
```

---

### 3. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Next.js frontend dependencies
npm install
```

---

### 4. Database Setup (Supabase)

Run the SQL migration in your Supabase SQL Editor:
```sql
-- Located in supabase/schema.sql
-- Enables vector extension and creates 'people' and 'introductions' tables
```
Or execute the automated schema script:
```bash
python -c "
import os, psycopg2
from dotenv import load_dotenv
load_dotenv()
# Run DDL against your Supabase connection string
"
```

---

### 5. Run the Ingestion Pipeline

Generate the raw dataset and run the 5-stage pipeline end-to-end:

```bash
# Step A: Generate synthetic applicant dataset (55 records, seeded duplicates, edge cases)
python data/generate_dataset.py

# Step B: Run full pipeline (Clean -> Dedupe -> Classify -> Fit Score -> Intro Match -> Supabase Upsert)
python -m pipeline.run_pipeline

# Step C: Run automated verification suite
python -m pipeline.verify
```

---

### 6. Start the Web App & Pipeline API

```bash
# Terminal 1: Start Next.js Operator Interface (Port 3000)
npm run dev

# Terminal 2: Start Pipeline Webhook API (Port 8000)
python -m pipeline.api
```

Open `http://localhost:3000` in your browser.

---

### 7. Import n8n Ingest Workflow

1. Open your n8n workspace (e.g. `https://n8n-render-utsav.onrender.com`).
2. Go to **Workflows** ➔ **Import from File**.
3. Select [`n8n/offline-crm-pipeline.json`](n8n/offline-crm-pipeline.json).
4. Follow instructions in [`n8n/SETUP.md`](n8n/SETUP.md) to wire the incoming webhook trigger (`/webhook/new-offline-applicant`) to Slack notifications.

---

## 🛠️ Repository Structure

```
offline-os/
├── app/                        # Next.js App Router Operator Console
│   ├── api/people/             # Server-side Supabase People API (zero client key leakage)
│   ├── api/introductions/      # Server-side Introductions status PATCH & GET
│   ├── globals.css             # DESIGN.md color tokens & DM Sans / IBM Plex Mono fonts
│   ├── layout.tsx              # Root HTML wrapper & font loaders
│   └── page.tsx                # Operator Console (Table, Duplicates Queue, Intros, Drawer)
├── data/                       # Datasets & local SQLite API cache
│   ├── generate_dataset.py     # Deterministic generator (55 records, 6 duplicates, 11 incomplete)
│   ├── raw_people.json         # Raw uncleaned input
│   ├── cleaned_people.json     # Cleaned & standardized records
│   ├── deduped_people.json     # Duplicates flagged with candidate links
│   ├── enriched_people.json    # Pydantic structured classifications
│   ├── fit_scored_people.json  # 0-100 rubric scores + Gemini explanations
│   ├── introductions.json      # Cosine similarity matches + intro rationales
│   └── gemini_cache.sqlite     # SQLite SHA-256 cache for zero redundant API calls
├── n8n/                        # Automation & Webhooks
│   ├── offline-crm-pipeline.json # Importable n8n workflow definition
│   └── SETUP.md                # Step-by-step import, ngrok tunnel, and curl testing guide
├── pipeline/                   # Core Python Processing Pipeline
│   ├── api.py                  # FastAPI webhook server (POST /process-new-record)
│   ├── clean.py                # Data normalization & missing field audit
│   ├── dedupe.py               # RapidFuzz scoring + Gemini 3.5 ambiguous pair adjudication
│   ├── enrich_classify.py      # Structured JSON schema classification
│   ├── fit_score.py            # 100-pt rubric fit scorer + Gemini explainability reasoning
│   ├── gemini_client.py        # Shared client (SQLite cache + 4.2s throttle + backoff retry)
│   ├── intro_match.py          # 768-dim embeddings + cosine similarity + bilateral rationale
│   ├── run_pipeline.py         # Master orchestrator
│   └── verify.py               # Automated verification test suite (8 assertions)
├── supabase/                   # Database DDL & Schemas
│   └── schema.sql              # PostgreSQL tables with pgvector index & foreign keys
├── ARCHITECTURE.md             # System design, data flow diagrams, and tool justifications
├── DESIGN.md                   # Brand tokens, color palette, typography, and density rules
├── PRD.md                      # Product requirements document
└── SUBMISSION_NOTE.md          # 4-section evaluation & future roadmap
```

---

## 🔒 Security Architecture

* **Zero Client-Side Secret Leakage:** Database credentials (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) run strictly inside Python services or Next.js Route Handlers (`app/api/*`). The browser client never touches private keys.
* **Rate-Limit Resilience:** The shared Gemini client enforces a minimum 4.2s interval between live API calls and persistent SQLite disk caching to operate reliably within Google AI Studio free tier limits.
