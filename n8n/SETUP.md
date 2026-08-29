# n8n Automation Setup Guide

This guide explains how to import and operate the **Offline CRM Ingestion & AI Workflow** in your n8n instance at `https://n8n-render-utsav.onrender.com`.

---

## 1. Architecture Overview

```
Incoming Webhook (Airtable / Form / API)
                │
                ▼
      [Webhook Trigger Node]
                │
                ▼
  [HTTP: Process via Python Pipeline]  ───> Calls POST /process-new-record
                │
                ▼
  [Code: Format Slack Notification]   ───> Generates Slack Block-Kit format
         ├───> [HTTP: Send Slack Webhook]
         └───> [Respond to Webhook (200 JSON)]
```

Because n8n cannot execute native Python modules with C-extensions (`rapidfuzz`, `pandas`, `google-genai`), we expose a lightweight FastAPI service in [`pipeline/api.py`](file:///u:/offline-os/pipeline/api.py) that executes the verified clean ➔ dedupe ➔ enrich ➔ fit score ➔ intro matching pipeline.

---

## 2. Step-by-Step Import Instructions

### Step 1: Start the Local Pipeline API
In your terminal, start the pipeline API backend:
```bash
python -m pipeline.api
```
*API runs on `http://localhost:8000` (or your configured `PORT`).*

> **Tip for Cloud n8n (`n8n-render-utsav.onrender.com`):**  
> If your n8n is hosted on Render and your API runs locally on your machine, expose port 8000 using ngrok or cloudflare tunnels:
> ```bash
> ngrok http 8000
> ```
> Then update the URL in the n8n HTTP Request node to your public ngrok URL (e.g. `https://xxxx.ngrok-free.app/process-new-record`).

---
### Step 2: Live Cloud Pipeline API (Render)
The Python enrichment & deduplication pipeline runs live on Render:
* **Live API URL:** `https://offline-os.onrender.com`
* **Ingestion Endpoint:** `POST https://offline-os.onrender.com/process-new-record`
* **Health Check:** `GET https://offline-os.onrender.com/health`

### Step 3: Configure Cloud Workflow & Notification Destinations
1. In n8n, open the imported workflow **"Offline CRM - New Applicant Ingest & AI Enrichment"**.
2. Double-click the **"HTTP: Process via Python Pipeline"** node:
   * **URL:** Pre-configured to `https://offline-os.onrender.com/process-new-record`
3. (Optional) Double-click the **"HTTP: Send Slack Webhook"** node:
   * Paste your team's live Slack Incoming Webhook URL (`https://hooks.slack.com/services/T.../B.../...`) or Discord webhook URL.
   * If you do not use Slack, the workflow automatically bypasses notification errors (`continueOnFail: true`) and returns the complete enriched applicant payload directly in the HTTP 200 webhook response.
3. Click **Save** and toggle the workflow to **Active**.

---

## 3. Testing the Webhook

### Test 1: New Qualified Founder Applicant
Run the following curl command against your n8n webhook URL:

```bash
curl -X POST "https://n8n-render-utsav.onrender.com/webhook/new-offline-applicant" \
  -H "Content-Type: application/json" \
  -d '{
    "source_record_id": "applicant-webhook-101",
    "name": "Sameer Joshi",
    "email": "sameer@zerotrace.ai",
    "company": "ZeroTrace AI",
    "role_title": "Co-Founder & CEO",
    "bio_notes": "Ex-Stripe engineering lead building automated compliance and fraud detection for Asian fintechs. Raising seed and looking for design partners.",
    "source": "applicant"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "name": "Sameer Joshi",
  "company": "Zerotrace AI",
  "role_title": "Co-Founder & CEO",
  "role_type": "founder",
  "seniority": "executive",
  "sector_tags": ["fintech", "ai", "ops"],
  "fit_score": 92.0,
  "fit_score_reasoning": "Sameer received a high score as an executive co-founder and CEO with deep fintech infra expertise.",
  "top_introductions": [
    {
      "matched_person_name": "Rahul Mehta",
      "matched_person_company": "Nexora Pay",
      "match_band": "strong",
      "shared_context": "Fintech & payments infrastructure synergy"
    }
  ]
}
```

---

### Test 2: Duplicate Applicant
Test duplicate detection by sending an existing name with similar details:

```bash
curl -X POST "https://n8n-render-utsav.onrender.com/webhook/new-offline-applicant" \
  -H "Content-Type: application/json" \
  -d '{
    "source_record_id": "test-dup-999",
    "name": "rahul mehta",
    "email": "rahul.m@nexorapay.in",
    "company": "Nexora Pay",
    "role_title": "COO",
    "bio_notes": "Payments infra builder",
    "source": "event"
  }'
```

**Expected Response (Duplicate Flagged):**
```json
{
  "status": "duplicate_flagged",
  "name": "Rahul Mehta",
  "is_duplicate": true,
  "duplicate_of": "airtable-001",
  "confidence": 0.96,
  "suggested_actions": ["Review in Duplicates Queue", "Merge with canonical"]
}
```
