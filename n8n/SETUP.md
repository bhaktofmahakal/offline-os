# n8n Automation & VIP Intake Bot Guide

This guide documents the **NetworkOS VIP Intake Bot & Autonomous Triage Workflow** deployed live on your n8n instance at `https://n8n-render-utsav.onrender.com`.

---

## 1. Upgraded Architecture & Data Flow

```
Incoming Webhook (Airtable / Form / Portal)
                 │
                 ▼
       [Webhook Trigger Node]
                 │
                 ▼
 [HTTP: NetworkOS Ingestion Engine]  ───> Calls POST https://offline-os-gray.vercel.app/api/v1/ingest
                 │
                 ▼
      [Code: Triage Classifier]
                 │
                 ▼
      [Switch: Triage Router]
      ├── Output 0 (VIP: Fit Score >= 85)
      │       │
      │       ▼
      │   [HTTP: Autonomous Tavily Research] ───> Background POST /api/tavily/research
      │       │
      │       ▼
      │   [Code: VIP Slack Block-Kit Formatter]
      │       │
      │       ▼
      │   [HTTP: Send VIP Slack Webhook] ───> #offline-vip-intake
      │
      ├── Output 1 (Duplicate Detected: is_duplicate === true)
      │       │
      │       ▼
      │   [Code: Duplicate Slack Block-Kit Formatter]
      │       │
      │       ▼
      │   [HTTP: Send Duplicate Slack Webhook] ───> #offline-duplicates
      │
      └── Output 2 (Standard Member: Fit Score < 85)
              │
              ▼
          [Code: Standard Intake Formatter]
              │
              ▼
      [Respond to Webhook (200 JSON)] ───> Instant structured response to caller
```

---

## 2. Live Deployed Workflow Details

* **Instance URL:** `https://n8n-render-utsav.onrender.com`
* **Workflow Name:** `NetworkOS - VIP Intake Bot & Autonomous Triage`
* **Workflow ID:** `D9gqdD1f2UB93gBk`
* **Live Webhook URL:** `https://n8n-render-utsav.onrender.com/webhook/new-offline-applicant`
* **Status:** 🟢 **Active & Live**

---

## 3. Key Upgrades in this Phase

### A. Real-Time Slack VIP Intake Bot (`#offline-vip-intake`)
* **Conditional Triage**: Automatically branches applicants based on their verified 100-point rubric fit score.
* **Autonomous Deep Intelligence Trigger**: For candidates scoring $\ge 85$, n8n triggers the **Tavily Deep Research API** (`POST /api/tavily/research`) in the background. By the time an operator reviews the Slack card, the autonomous executive dossier is already pre-compiled!
* **Interactive Mobile Triage Buttons (Slack Block-Kit `actions`)**:
  * 🟢 **`[Approve & Welcome]`**: Operator can approve the candidate with 1 click (`action_id: "approve_welcome"`).
  * 🤝 **`[Suggest Intro]`**: Instant warm intro discovery (`action_id: "suggest_intro"`).
  * 🔬 **`[Deep Research Memo]`**: Deep-link to the NetworkOS Deep Intelligence Lab query.

### B. Duplicate Applicant Alert (`#offline-duplicates`)
* Whenever RapidFuzz or Gemini flags an applicant as an existing canonical match, n8n routes them to the duplicate queue alert channel.
* Includes: Match confidence percentage, existing canonical record ID, and a 1-click **`[Review in Duplicates Queue]`** button.

### C. Native Serverless Ingestion Engine
* Replaced the slow cold-start microservice with **NetworkOS Vercel Serverless API**: `https://offline-os-gray.vercel.app/api/v1/ingest`
* Response time: **< 1.2 seconds** end-to-end.

---

## 4. Testing the Live n8n Workflow

### Test 1: New VIP Founder Applicant (>85)
Send a high-signal founder applicant through the live n8n webhook:

```bash
curl -X POST "https://n8n-render-utsav.onrender.com/webhook/new-offline-applicant" \
  -H "Content-Type: application/json" \
  -d '{
    "source_record_id": "vip-demo-001",
    "name": "Vikram Sethi",
    "email": "vikram@neuralhyper.ai",
    "company": "NeuralHyper AI",
    "role_title": "Founder & CEO",
    "bio_notes": "Ex-DeepMind research scientist building autonomous agent infrastructure for robotics. Raised $4M seed from Accel. Looking for founder introductions in Bangalore.",
    "source": "applicant"
  }'
```

**Expected Result**:
* **HTTP 200 OK**: Instant enriched candidate response.
* **Triage Branch**: Routes to `vip` branch.
* **Tavily Research**: Initiated in the background for Vikram Sethi.
* **Slack Payload**: Block-Kit card with interactive `[Approve & Welcome]`, `[Suggest Intro]`, and `[Deep Research Memo]` buttons dispatched to `#offline-vip-intake`.

---

### Test 2: Duplicate Applicant Triage
Send an applicant with high similarity to an existing canonical record:

```bash
curl -X POST "https://n8n-render-utsav.onrender.com/webhook/new-offline-applicant" \
  -H "Content-Type: application/json" \
  -d '{
    "source_record_id": "dup-demo-002",
    "name": "vikram sethi",
    "email": "vikram.sethi@neuralhyper.ai",
    "company": "NeuralHyper AI",
    "role_title": "CEO",
    "bio_notes": "Robotics agent builder",
    "source": "event"
  }'
```

**Expected Result**:
* **Triage Branch**: Routes to `duplicate` branch.
* **Slack Payload**: Duplicate warning card with match confidence and `[Review in Duplicates Queue]` button.
