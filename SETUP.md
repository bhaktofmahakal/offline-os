# Offline CRM Setup

This document prepares local credentials for the prototype. It does not create a database schema, upload data, connect to n8n, or run the pipeline.

## Prerequisites

- A Google account that can use Google AI Studio.
- A Supabase account.
- A local checkout of this project at `U:\offline-os`.
- Python and Node.js installed before implementation begins.
- The self-hosted n8n instance URL: `https://n8n-render-utsav.onrender.com`.

Use the current provider documentation if a dashboard label differs:

- Supabase getting started: https://supabase.com/docs/guides/getting-started
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Google Gemini API keys: https://ai.google.dev/gemini-api/docs/api-key

## 1. Create The Local Environment File

From PowerShell in the project root:

```powershell
Copy-Item .env.example .env
```

Open `.env` locally and replace the four placeholders after completing the next two sections. Keep the variable names exactly as shown.

## 2. Create A Free Supabase Project

1. Go to https://supabase.com/dashboard and sign in.
2. Choose **New project**.
3. Create or select an organization.
4. Set the project name to something like `offline-crm`.
5. Select the **Free** plan.
6. Choose a region near the expected demo location.
7. Generate a strong database password and store it in a password manager. It is separate from the API keys below.
8. Create the project and wait until the project finishes provisioning.
9. Open the project **Connect** dialog, or go to **Project Settings -> API Keys**.
10. Copy the **Project URL** into `.env` as `SUPABASE_URL`. It should look like `https://<project-ref>.supabase.co`.
11. Copy the low-privilege `anon` key into `.env` as `SUPABASE_ANON_KEY`.
12. Copy the elevated `service_role` key into `.env` as `SUPABASE_SERVICE_ROLE_KEY`.

Supabase is introducing new key labels. If the dashboard shows only new keys, use the equivalent mapping below:

| `.env` variable | Legacy dashboard label | New dashboard label | Intended use |
| --- | --- | --- | --- |
| `SUPABASE_ANON_KEY` | `anon` | Publishable key (`sb_publishable_...`) | RLS-protected application access |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` | Secret key (`sb_secret_...`) | Python pipeline server-side writes |

Security rules:

- The service-role/secret key bypasses RLS. Use it only in the local Python pipeline or another secured backend process.
- Never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_*` variable, client component, browser bundle, n8n workflow JSON, screenshot, README, or chat message.
- The anon/publishable key is the low-privilege key, but database RLS policies still control access. The later schema phase must enable and review RLS.
- Do not paste the database password into `.env`; it is not needed by the planned application path.

## 3. Get A Free Gemini API Key

1. Go to https://aistudio.google.com/app/apikey and sign in.
2. If AI Studio asks you to accept its terms or choose a project, complete that step.
3. Choose **Create API key** or copy an existing key created for this prototype.
4. Keep the key on the Google AI Studio free tier. Do not enable billing or attach a paid API path for this assignment.
5. Put the value in `.env` as `GEMINI_API_KEY`.

The prototype will use the Google Gemini API from Python. It will use `gemini-2.5-flash` or `gemini-2.5-flash-lite` for generation and a supported Gemini embedding model for similarity, subject to the free-tier availability at implementation time.

Treat `15 requests per minute` and approximately `1,000 requests per day` as hard project limits. The pipeline must batch where possible, sleep between calls, back off on `429` responses, and report skipped or failed calls. A quota error is a reason to resume later, not a reason to enable billing.

## 4. Where Each Value Goes

The completed local `.env` should have this shape, with real values substituted locally:

```dotenv
GEMINI_API_KEY=<value from Google AI Studio>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon or publishable key from Supabase>
SUPABASE_SERVICE_ROLE_KEY=<service_role or secret key from Supabase>
```

| Variable | Source | Used by | Keep out of |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Google AI Studio | Python enrichment, scoring rationale, and embedding calls | Browser bundle, public repo, n8n JSON |
| `SUPABASE_URL` | Supabase Connect/API Keys | Python and Next.js server-side clients | No secret by itself, but keep env handling consistent |
| `SUPABASE_ANON_KEY` | Supabase Connect/API Keys | Low-privilege RLS-protected application reads/actions | Server-role substitutions or unrestricted policies |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Connect/API Keys | Python pipeline upserts and controlled admin operations | Browser, `NEXT_PUBLIC_*`, client components, logs, n8n JSON |

Do not rename these variables. Later implementation code will load them from the environment rather than hard-code values.

## 5. Local Security Check

Before implementation, confirm:

- `.env` exists beside `.env.example`.
- Every placeholder in `.env` has been replaced.
- `.env` is ignored by the repository before any commit is created.
- No real API key appears in `.env.example`, source files, test fixtures, screenshots, or workflow JSON.
- If a key is exposed, revoke or rotate it immediately in the provider dashboard.

Do not use a command that prints the full `.env` contents while verifying it. Check only whether the file exists and whether each required variable is populated.

## 6. n8n Boundary For This Prototype

The n8n instance is user-managed and will not be connected to directly from this project. The later implementation phase will produce an importable workflow JSON and a separate workflow setup note.

When that JSON is ready, the manual process will be:

1. Sign in to https://n8n-render-utsav.onrender.com.
2. Import the workflow JSON from the n8n editor.
3. Create or select the required n8n credentials in the UI.
4. Configure the Python pipeline endpoint or local runner expected by the workflow.
5. Verify every credentialed node before testing.
6. Test with a sanitized sample payload before publishing or scheduling it.

The JSON must contain no Supabase or Gemini secrets. Credentials belong in n8n's credential store or environment configuration, not in exported workflow data.

## 7. Expected Next Step

After the environment values are set, implementation can proceed in the PRD order: schema and RLS, deterministic Python pipeline stages, rate-limited Gemini calls, embedding-based introduction matching, the Next.js review surface, and the importable n8n workflow.
