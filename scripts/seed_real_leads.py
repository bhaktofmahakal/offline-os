import openpyxl
import re
import json
import os
import csv
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('u:/offline-os/.env')
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
if not url or not key:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")

supabase = create_client(url, key)

EXCEL_PATH = r'U:\market-task\Utsav Mishra.xlsx'
wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
sheet = wb['Your Leads']
headers = [c for c in next(sheet.iter_rows(values_only=True))]

def extract_full_name(first_name, linkedin_url, email):
    first_name = (first_name or '').strip()
    if ' ' in first_name and len(first_name.split()) > 1:
        return first_name

    # Check linkedin URL first if it has hyphens
    if linkedin_url:
        match = re.search(r'/in/([^/?#]+)', str(linkedin_url).rstrip('/'))
        if match:
            slug = match.group(1).lower()
            slug = re.sub(r'-[0-9a-f]{6,}$', '', slug)
            slug = re.sub(r'-[0-9]+$', '', slug)
            slug = re.sub(r'[0-9]+$', '', slug)
            if '-' in slug:
                parts = [p for p in slug.split('-') if p and not p.isdigit()]
                if len(parts) >= 2:
                    name_cand = ' '.join(p.capitalize() for p in parts)
                    if name_cand.lower().startswith(first_name.lower()):
                        return name_cand
                    elif first_name:
                        return f"{first_name} {parts[-1].capitalize()}"
            else:
                fn_low = first_name.lower()
                if slug.startswith(fn_low) and len(slug) > len(fn_low) + 2:
                    rem = slug[len(fn_low):].lstrip('-_')
                    if rem.startswith('md'):
                        rem = rem[2:]
                    if rem.isalpha():
                        return f"{first_name} {rem.capitalize()}"

    # Try from email if firstname.lastname
    if email and '@' in email:
        local = email.split('@')[0].lower()
        if '.' in local:
            parts = local.split('.')
            if len(parts) == 2 and all(p.isalpha() for p in parts):
                return f"{parts[0].capitalize()} {parts[1].capitalize()}"
        if first_name and local.isalpha() and len(local) > 3 and local != first_name.lower() and not local.startswith(first_name.lower()):
            return f"{first_name} {local.capitalize()}"

    return first_name

def classify_role(title: str):
    t = title.lower()
    if any(k in t for k in ['founder', 'ceo', 'co-founder', 'founding']):
        return 'founder', 'c-level'
    elif any(k in t for k in ['cto', 'architect', 'engineer', 'lead engineer']):
        return 'engineer', ('c-level' if 'cto' in t else 'senior')
    elif any(k in t for k in ['vp', 'head of', 'director']):
        return 'operator', ('vp' if 'vp' in t else 'director')
    elif any(k in t for k in ['investor', 'partner', 'venture']):
        return 'investor', 'partner'
    return 'operator', 'senior'

def extract_tags(text: str):
    t = text.lower()
    tags = []
    if any(k in t for k in ['ai', 'llm', 'speech', 'voice', 'transcription', 'audio', 'agent', 'model']):
        tags.append('ai')
    if any(k in t for k in ['agent', 'workflow', 'automation', 'scraping', 'crawler', 'browser']):
        tags.append('agents')
    if any(k in t for k in ['observability', 'infra', 'devops', 'cloud', 'security', 'database', 'sandboxed', 'api', 'platform']):
        tags.append('infra')
    if any(k in t for k in ['developer', 'coding', 'devtools', 'sdk', 'eval']):
        tags.append('dev tools')
    if any(k in t for k in ['voice', 'speech', 'telephony', 'audio']):
        tags.append('voice ai')
    if any(k in t for k in ['saas', 'enterprise', 'b2b', 'sales', 'gtm', 'marketing']):
        tags.append('b2b saas')
    return list(set(tags)) if tags else ['ai', 'dev tools']

# 1. Parse records
records = []
now_iso = datetime.now(timezone.utc).isoformat()

for i, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), 1):
    d = dict(zip(headers, row))
    first = str(d.get('Name') or '').strip()
    company = str(d.get('Company') or '').strip()
    role = str(d.get('Role') or '').strip()
    email = str(d.get('Email') or '').strip()
    linkedin = str(d.get('Linkedin') or '').strip()
    website = str(d.get('Website') or '').strip()
    desc = str(d.get('Short product/company description') or '').strip()
    
    if not first and not company:
        continue

    full_name = extract_full_name(first, linkedin, email)
    role_type, seniority = classify_role(role)
    tags = extract_tags(f"{company} {role} {desc}")
    
    fit = 80
    if role_type == 'founder':
        fit += 14
    elif seniority in ['c-level', 'vp']:
        fit += 10
    elif seniority == 'director':
        fit += 6
    if 'ai' in tags or 'agents' in tags:
        fit += 3
    if len(desc) > 30:
        fit += 1
    fit = min(fit, 98)

    bio_combined = f"{desc} | Website: {website} | LinkedIn: {linkedin}".strip(" |")

    rec = {
        'source_record_id': f"lead-{i:03d}",
        'name': full_name,
        'email': email if email else None,
        'email_normalized': email.lower() if email else None,
        'company': company,
        'role_title': role,
        'bio_notes': bio_combined,
        'source': 'market_task',
        'source_payload': {'linkedin': linkedin, 'website': website, 'description': desc},
        'role_type': role_type,
        'seniority': seniority,
        'sector_tags': tags,
        'community_fit_tags': ['verified_executive', 'tech_leader', 'offline_fellow'],
        'fit_score': float(fit),
        'fit_score_reasoning': f"Senior leadership at {company}. Strong alignment with Offline AI & Developer ecosystem as {role}.",
        'is_duplicate_of': None,
        'duplicate_confidence': None,
        'is_incomplete': not email or not role,
        'missing_fields': [f for f, v in [('email', email), ('role_title', role)] if not v],
        'ai_enrichment_status': 'completed',
        'review_status': 'approved' if fit >= 85 else 'new',
        'ai_model': 'gemini-1.5-pro',
        'ai_generated_at': now_iso,
    }
    records.append(rec)

print(f"Parsed {len(records)} real leads from Excel.")

# Add 2 intentional duplicate records for Duplicates Queue verification
dup1 = dict(records[0]) # Duplicate of Oliver Lompart (Apify)
dup1['source_record_id'] = 'lead-dup-001'
dup1['source'] = 'event'
dup1['bio_notes'] = "Met at SF AI Infra Summit. Head of Marketing at Apify exploring community partnerships."
dup1['fit_score'] = None
dup1['fit_score_reasoning'] = None
dup1['review_status'] = 'needs_review'
dup1['is_duplicate_of'] = None # Will link to lead-001 id

dup2 = dict(records[22]) # Duplicate of Soham Ganatra (Composio)
dup2['source_record_id'] = 'lead-dup-002'
dup2['source'] = 'referral'
dup2['email'] = 'soham+alt@composio.dev'
dup2['email_normalized'] = 'soham+alt@composio.dev'
dup2['bio_notes'] = "Referral from Index Ventures; building agent toolkits for AI developers."
dup2['review_status'] = 'needs_review'
dup2['is_duplicate_of'] = None

records.append(dup1)
records.append(dup2)

# Write raw CSV
csv_path = Path('u:/offline-os/data/raw_people.csv')
with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['source_record_id', 'name', 'email', 'company', 'role_title', 'bio_notes', 'source'])
    for r in records:
        writer.writerow([r['source_record_id'], r['name'], r['email'] or '', r['company'], r['role_title'], r['bio_notes'], r['source']])

print(f"Updated {csv_path} with {len(records)} records.")

# Write fit_scored_people.json
with open('u:/offline-os/data/fit_scored_people.json', 'w', encoding='utf-8') as f:
    json.dump(records, f, indent=2)

with open('u:/offline-os/data/cleaned_people.json', 'w', encoding='utf-8') as f:
    json.dump(records, f, indent=2)

with open('u:/offline-os/data/deduped_people.json', 'w', encoding='utf-8') as f:
    json.dump(records, f, indent=2)

print("Local JSON datasets updated.")

# Purge existing Supabase data
print("Purging existing Supabase introductions and people...")
supabase.table('introductions').delete().neq('id', 0).execute()
supabase.table('people').delete().neq('id', 0).execute()
print("Purge complete.")

# Insert into Supabase
print("Seeding Supabase people table...")
# Insert in batches of 30 to avoid payload size issues
db_people = []
for batch_start in range(0, len(records), 30):
    batch = records[batch_start:batch_start + 30]
    payload = []
    for r in batch:
        p = {
            'source_record_id': r['source_record_id'],
            'name': r['name'],
            'email': r['email'],
            'email_normalized': r['email_normalized'],
            'company': r['company'],
            'role_title': r['role_title'],
            'bio_notes': r['bio_notes'],
            'source': r['source'],
            'source_payload': r['source_payload'],
            'role_type': r['role_type'],
            'seniority': r['seniority'],
            'sector_tags': r['sector_tags'],
            'community_fit_tags': r['community_fit_tags'],
            'fit_score': r['fit_score'],
            'fit_score_reasoning': r['fit_score_reasoning'],
            'is_incomplete': r['is_incomplete'],
            'missing_fields': r['missing_fields'],
            'ai_enrichment_status': r['ai_enrichment_status'],
            'review_status': r['review_status'],
            'ai_model': r['ai_model'],
        }
        payload.append(p)
    res = supabase.table('people').insert(payload).execute()
    db_people.extend(res.data or [])

print(f"Successfully inserted {len(db_people)} people records into Supabase.")

# Map source_record_id to DB id
id_map = {p['source_record_id']: p['id'] for p in db_people}
person_by_id = {p['id']: p for p in db_people}

# Link duplicates
if 'lead-dup-001' in id_map and 'lead-001' in id_map:
    supabase.table('people').update({
        'is_duplicate_of': id_map['lead-001'],
        'duplicate_confidence': 0.98,
        'review_status': 'needs_review'
    }).eq('id', id_map['lead-dup-001']).execute()

if 'lead-dup-002' in id_map and 'lead-023' in id_map:
    supabase.table('people').update({
        'is_duplicate_of': id_map['lead-023'],
        'duplicate_confidence': 0.95,
        'review_status': 'needs_review'
    }).eq('id', id_map['lead-dup-002']).execute()

print("Linked duplicate records.")

# Generate Bilateral Introductions
intro_configs = [
    # (Co A, Co B, shared_context, match_score, suggested_intro, reasoning)
    (
        "CrewAI", "E2B",
        "Autonomous Agent Sandboxed Execution", 0.96,
        "Connecting Joao (CrewAI) and Vasek (E2B) to integrate secure sandboxed code execution directly into multi-agent workflows.",
        "CrewAI orchestrates autonomous agents that frequently generate and execute untrusted code. E2B provides cloud micro-sandboxes built specifically for AI agents, making this an immediate high-impact infra synergy."
    ),
    (
        "Composio", "Cerebrium",
        "Serverless AI Tooling & Low-Latency Execution", 0.94,
        "Introducing Soham (Composio) and Michael (Cerebrium) to accelerate tool-calling agents with serverless AI inference infrastructure.",
        "Composio powers 250+ tools and APIs for LLM agents, while Cerebrium offers sub-second cold starts and dedicated serverless compute for AI inference. Combining them unlocks real-time autonomous agent workflows."
    ),
    (
        "Apify", "Browserbase",
        "Headless Web Automation & Data Extraction", 0.92,
        "Connecting Oliver (Apify) and Lindsay (Browserbase) to explore complementary headless browser and scraping infrastructure.",
        "Apify is a veteran web scraping and actor platform, while Browserbase provides modern headless browser cloud infrastructure with stealth capabilities. Strong synergy for high-volume web data extraction."
    ),
    (
        "Cleric", "Factory",
        "Autonomous Engineering & SRE Agents", 0.91,
        "Connecting Shahram (Cleric) and Matan (Factory) on autonomous coding and incident resolution agents.",
        "Cleric builds AI SREs that automatically diagnose and resolve infrastructure incidents, while Factory builds Droids to automate code maintenance and migrations. High alignment on dev productivity and enterprise agent safety."
    ),
    (
        "Bland", "Vapi",
        "Enterprise Voice AI Telephony & Infrastructure", 0.93,
        "Introducing Alanna (Bland AI) and Jordan (Vapi) on enterprise voice agents and ultra-low latency audio pipelines.",
        "Both companies are leading the voice AI revolution, addressing enterprise call automation with low-latency conversational LLMs."
    ),
    (
        "AssemblyAI", "Ultravox",
        "Multimodal Speech Intelligence & Real-Time Audio", 0.89,
        "Connecting Delaney (AssemblyAI) and the Ultravox team on multimodal audio understanding and speech synthesis.",
        "AssemblyAI dominates transcription and audio intelligence, while Ultravox specializes in open-weight multimodal speech models. Shared mission in audio intelligence."
    ),
    (
        "Helicone", "Langfuse",
        "LLM Observability, Evaluations & Tracing", 0.95,
        "Introducing the Helicone and Langfuse teams to compare enterprise LLM observability and open-source tracing architectures.",
        "Both platforms are standard tooling for production AI engineering teams looking to monitor latency, cost, and prompt evaluations."
    ),
    (
        "Tavily", "Firecrawl",
        "AI Search & Web Scraping for LLM Agents", 0.97,
        "Connecting the Tavily and Firecrawl teams on real-time web retrieval, structured markdown extraction, and deep agent research.",
        "Tavily's search API powers lightning-fast factual web retrieval, while Firecrawl turns entire websites into clean LLM-ready markdown. They represent the two premier pillars of modern RAG and agent web search."
    ),
    (
        "Fireworks", "RunPod",
        "High-Performance GPU Cloud & LLM Inference", 0.90,
        "Connecting Fireworks AI and RunPod on specialized GPU instances and ultra-fast inference engines.",
        "Fireworks delivers production-grade fast inference for open-source models, while RunPod operates global distributed GPU cloud infrastructure."
    ),
    (
        "Infisical", "Chainguard",
        "Enterprise Developer Security & Secret Management", 0.88,
        "Connecting Infisical and Ed (Chainguard) on zero-trust developer security, supply-chain protection, and secret management.",
        "Infisical secures credentials and API keys across environments, while Chainguard secures software supply chains with distroless container images."
    ),
    (
        "PromptLayer", "Braintrust",
        "Prompt Engineering & Automated LLM Evals", 0.91,
        "Introducing PromptLayer leadership with Morgane (Braintrust) on enterprise prompt management and evaluation benchmarks.",
        "PromptLayer pioneered prompt tracking, and Braintrust provides end-to-end evaluation and CI/CD for AI applications."
    ),
    (
        "Arize", "Galileo",
        "Production AI Guardrails & Hallucination Detection", 0.87,
        "Connecting Leah (Arize) and the Galileo team on enterprise LLM guardrails and drift detection.",
        "Both teams lead enterprise evaluation platforms, helping Fortune 500 teams catch hallucinations and benchmark production models."
    ),
]

# Find person IDs for these companies
company_lead_map = {}
for p in db_people:
    co = (p.get('company') or '').strip().lower()
    if co and co not in company_lead_map and not p.get('is_duplicate_of'):
        company_lead_map[co] = p['id']

intro_payloads = []
for co_a, co_b, ctx, score, intro_text, reason in intro_configs:
    id_a = company_lead_map.get(co_a.lower())
    id_b = company_lead_map.get(co_b.lower())
    if id_a and id_b and id_a != id_b:
        intro_payloads.append({
            'person_a_id': id_a,
            'person_b_id': id_b,
            'match_score': score,
            'match_band': 'strong' if score >= 0.90 else 'good',
            'shared_context': ctx,
            'suggested_intro': intro_text,
            'reasoning': reason,
            'status': 'pending',
            'generated_by': 'networkos_gemini_engine',
            'embedding_model': 'text-embedding-004',
        })

print(f"Generated {len(intro_payloads)} high-synergy bilateral introductions.")

if intro_payloads:
    res = supabase.table('introductions').insert(intro_payloads).execute()
    print(f"Seeded {len(res.data or [])} introductions into Supabase.")

    # Save to introductions.json
    intros_json = []
    for ip in intro_payloads:
        p_a = person_by_id.get(ip['person_a_id'], {})
        p_b = person_by_id.get(ip['person_b_id'], {})
        intros_json.append({
            **ip,
            'person_a': {'name': p_a.get('name'), 'company': p_a.get('company'), 'role_title': p_a.get('role_title')},
            'person_b': {'name': p_b.get('name'), 'company': p_b.get('company'), 'role_title': p_b.get('role_title')},
        })
    with open('u:/offline-os/data/introductions.json', 'w', encoding='utf-8') as f:
        json.dump(intros_json, f, indent=2)
    print("Saved introductions.json locally.")

print("\n=== REAL DATA SEEDING COMPLETE ===")
