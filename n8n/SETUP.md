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

### Step 2: Import Workflow into n8n

1. Log into your n8n instance: `https://n8n-render-utsav.onrender.com`
2. Go to **Workflows** ➔ Click **Add Workflow** (or the `+` icon).
3. In the top-right menu (three dots `...`), select **Import from File**.
4. Choose [`n8n/offline-crm-pipeline.json`](file:///u:/offline-os/n8n/offline-crm-pipeline.json).
5. The workflow will appear on your canvas with all 5 nodes connected.

---

### Step 3: Configure Variables & Credentials

1. **HTTP Request Node (`HTTP: Process via Python Pipeline`):**
   * Change `http://localhost:8000/process-new-record` to your hosted / tunnel URL if n8n is running in the cloud.
2. **Slack Notification Node (`HTTP: Send Slack Webhook`):**
   * Replace `https://hooks.slack.com/services/REPLACE_WITH_YOUR_SLACK_WEBHOOK` with your Slack incoming webhook URL. *(If you don't have Slack configured yet, the node has `Continue on Fail` enabled so it won't block the pipeline).*
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
