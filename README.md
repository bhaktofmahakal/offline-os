# Offline OS — AI-Powered Operator CRM & Member Intelligence

A production-grade, automated CRM intelligence engine and operator console built for **Offline** — evaluating member fit, adjudicating duplicate applications, generating 768-dimensional semantic embeddings, and synthesizing bilateral introduction matches with draft icebreakers.

---

## 🌐 Live Production Deployments

| Component | Platform | Live URL |
| :--- | :--- | :--- |
| **Operator Console (Dashboard)** | **Vercel** | **[https://offline-os-gray.vercel.app](https://offline-os-gray.vercel.app)** |
| **Public Apply Portal** | **Vercel** | **[https://offline-os-gray.vercel.app/apply](https://offline-os-gray.vercel.app/apply)** |
| **Python Pipeline API** | **Render** | **[https://offline-os.onrender.com](https://offline-os.onrender.com/health)** |
| **GitHub Repository** | **GitHub** | **[https://github.com/bhaktofmahakal/offline-os](https://github.com/bhaktofmahakal/offline-os)** |


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
├── app/                        # Next.js 14 App Router (Operator Console & Public Portal)
│   ├── api/
│   │   ├── export/             # Dedicated Server-side RFC-4180 CSV & JSON Export API
│   │   ├── introductions/      # Introductions status PATCH & GET endpoints
│   │   ├── people/             # Full CRUD endpoints for members (GET, PATCH, DELETE)
│   │   └── cron/keepalive/     # Serverless health & ping endpoint
│   ├── apply/                  # Public Applicant Portal with real-time AI evaluation
│   ├── globals.css             # Theme design tokens & typography
│   ├── layout.tsx              # Root layout & font configuration
│   └── page.tsx                # Operator Console (Members, Duplicates, Intros, Drawer)
├── data/                       # Datasets & pipeline input/output artifacts
│   ├── generate_dataset.py     # Deterministic synthetic applicant generator
│   ├── raw_people.csv          # Raw applicant CSV dataset
│   ├── raw_people.json         # Raw JSON input
│   ├── cleaned_people.json     # Standardized records
│   ├── deduped_people.json     # Flagged duplicates with canonical links
│   ├── enriched_people.json    # Pydantic structured classifications
│   ├── fit_scored_people.json  # 0-100 rubric scores + explainable reasoning
│   └── introductions.json      # Cosine similarity matches + draft icebreakers
├── lib/                        # Supabase client utilities
├── n8n/                        # n8n Automation Workflows
│   └── offline-crm-pipeline.json # Full workflow definition (Webhook -> Dedupe -> Slack)
├── pipeline/                   # 5-Stage Python AI Ingestion Pipeline
│   ├── clean.py                # Data normalization & missing field audit
│   ├── dedupe.py               # RapidFuzz + Gemini 2.5 Flash ambiguous pair adjudication
│   ├── enrich_classify.py      # Structured JSON schema classification
│   ├── fit_score.py            # 100-pt rubric fit scorer + explainability reasoning
│   ├── gemini_client.py        # SQLite caching + rate limiting + retry logic
│   ├── intro_match.py          # 768-dim embeddings + cosine similarity + bilateral rationale
│   ├── run_pipeline.py         # Master pipeline orchestrator
│   └── verify.py               # Automated verification test suite
├── supabase/                   # Database DDL & Schemas
│   └── schema.sql              # PostgreSQL tables with pgvector index & foreign keys
├── README.md                   # Setup guide & system overview
└── SUBMISSION_NOTE.md          # Official 4-part submission & architecture note
```

---

## 🚀 Growth & Automation Roadmap (What We'd Build Next)

1. **Bi-Directional Airtable REST & Webhook Sync**:
   * Connect Offline's existing Airtable bases via Airtable Webhooks API (`/v0/bases/{baseId}/webhooks`). 
   * Team members continue using Airtable while Offline OS runs in the background, writing back AI Fit Scores, Sector Tags, and Suggested Introductions into custom Airtable columns in real-time.

2. **Multi-Provider Waterfall Enrichment Pipeline**:
   * **Apollo.io API**: Automatically backfill company headcount, funding stage (Pre-Seed/Seed/Series A), and verified employee data.
   * **FindyMail API**: Real-time SMTP & MX deliverability checks to prevent bounced intros.
   * **Apify LinkedIn Scraper**: Ingest founder career timelines, past exits, patents, and mutual connection graphs without manual copy-pasting.
   * **TinyFish / Firecrawl Agentic Research**: For stealth founders with brief bios, spawn a headless browser subagent to parse their GitHub repositories, personal essays, and press mentions into a structured 360° founder dossier.

3. **Automated Double-Opt-In Intro Email Dispatch (Resend / Postmark)**:
   * When an operator clicks **Approve Intro**, the platform automatically generates and sends a personalized dual-opt-in email to both founders, tracking reply sentiment and connection outcomes over time.

4. **Real-Time Slack VIP Intake Bot (`#offline-vip-intake`)**:
   * Dispatch instant Block-Kit messages to a `#offline-vip-intake` Slack channel whenever an applicant scores **> 85**, complete with 1-click Slack interactive `[Approve & Welcome]`, `[Suggest Intro]`, and `[Review Duplicate]` buttons for mobile operator triage.

5. **Interactive 3D Graph-Based Community Cluster Visualization**:
   * WebGL / Three.js force-directed 3D graph of all members clustered by 768-dimensional `pgvector` cosine similarity to discover untapped cross-cohort synergies and detect under-connected founders.

---

## 🔒 Security Architecture

* **Zero Client-Side Secret Leakage:** Database credentials (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) run strictly inside Python services or Next.js Route Handlers (`app/api/*`). The browser client never touches private keys.
* **Rate-Limit Resilience:** The shared Gemini client enforces a minimum 4.2s interval between live API calls and persistent SQLite disk caching to operate reliably within Google AI Studio free tier limits.
