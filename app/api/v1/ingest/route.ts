import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Flexible extractor for webhook payloads (Tally, Typeform, n8n, Zapier, direct API)
function extractPayloadFields(body: any) {
  // If Tally webhook format: body.data.fields
  if (body?.data?.fields && Array.isArray(body.data.fields)) {
    const fields = body.data.fields;
    const findField = (...labels: string[]) => {
      const f = fields.find((item: any) =>
        labels.some(l => (item.label || item.key || '').toLowerCase().includes(l.toLowerCase()))
      );
      return f ? String(f.value || '').trim() : '';
    };

    return {
      name: findField('name', 'full name', 'founder name'),
      email: findField('email', 'work email', 'contact email'),
      company: findField('company', 'startup', 'organization'),
      role_title: findField('role', 'title', 'position'),
      bio_notes: findField('bio', 'about', 'background', 'description', 'notes'),
      website: findField('website', 'url', 'company website'),
      linkedin: findField('linkedin', 'profile'),
      source: 'tally_webhook',
    };
  }

  // Standard flat JSON or n8n payload
  const name = body.name || body.full_name || body.applicant_name || body.founder_name || '';
  const email = body.email || body.email_address || body.contact_email || '';
  const company = body.company || body.startup || body.organization || '';
  const role_title = body.role_title || body.role || body.title || body.designation || '';
  const bio_notes = body.bio_notes || body.bio || body.about || body.notes || body.background || '';
  const website = body.website || body.website_url || body.company_url || body.url || '';
  const linkedin = body.linkedin || body.linkedin_url || '';
  const source = body.source || 'n8n_webhook_ingest';

  return {
    name: String(name).trim(),
    email: String(email).trim(),
    company: String(company).trim(),
    role_title: String(role_title).trim(),
    bio_notes: String(bio_notes).trim(),
    website: String(website).trim(),
    linkedin: String(linkedin).trim(),
    source: String(source).trim(),
  };
}

function classifyRole(title: string, bio: string): { role_type: string; seniority: string } {
  const combined = `${title} ${bio}`.toLowerCase();
  let role_type = 'operator';
  let seniority = 'senior';

  if (combined.includes('founder') || combined.includes('ceo') || combined.includes('co-founder') || combined.includes('founding')) {
    role_type = 'founder';
    seniority = 'c-level';
  } else if (combined.includes('partner') || combined.includes('investor') || combined.includes('angel') || combined.includes('vc')) {
    role_type = 'investor';
    seniority = 'partner';
  } else if (combined.includes('cto') || combined.includes('engineer') || combined.includes('architect') || combined.includes('tech lead')) {
    role_type = 'engineer';
    seniority = combined.includes('cto') ? 'c-level' : 'senior';
  } else if (combined.includes('vp') || combined.includes('director') || combined.includes('head of')) {
    role_type = 'operator';
    seniority = combined.includes('vp') ? 'vp' : 'director';
  }

  return { role_type, seniority };
}

function extractSectorTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  const catalog: Record<string, string[]> = {
    'ai': ['ai', 'llm', 'machine learning', 'artificial intelligence', 'genai', 'agents', 'rag'],
    'b2b saas': ['saas', 'enterprise', 'b2b', 'software', 'workflow', 'crm'],
    'fintech': ['fintech', 'payments', 'banking', 'crypto', 'defi', 'credit', 'neobank'],
    'climate': ['climate', 'solar', 'carbon', 'energy', 'cleantech', 'sustainability', 'ev'],
    'deeptech': ['robotics', 'hardware', 'semiconductor', 'biotech', 'genomics', 'aerospace', 'quantum'],
    'infra': ['database', 'cloud', 'devops', 'kubernetes', 'infrastructure', 'security', 'api'],
  };

  for (const [tag, keywords] of Object.entries(catalog)) {
    if (keywords.some(k => lower.includes(k))) {
      tags.push(tag);
    }
  }

  return tags.length > 0 ? tags : ['tech'];
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const extracted = extractPayloadFields(rawBody);

    if (!extracted.name) {
      return NextResponse.json(
        { error: 'Missing required field: name (or full_name)' },
        { status: 400 }
      );
    }

    const { role_type, seniority } = classifyRole(extracted.role_title, extracted.bio_notes);
    const sector_tags = extractSectorTags(`${extracted.role_title} ${extracted.company} ${extracted.bio_notes}`);

    // Clean normalized email
    const emailNorm = extracted.email ? extracted.email.toLowerCase().trim() : null;

    // Check for obvious duplicate by email
    let is_dup_of: number | null = null;
    let dup_confidence: number | null = null;

    if (emailNorm) {
      const { data: existingMatch } = await supabase
        .from('people')
        .select('id, name, email')
        .eq('email_normalized', emailNorm)
        .limit(1)
        .maybeSingle();

      if (existingMatch) {
        is_dup_of = existingMatch.id;
        dup_confidence = 1.0;
      }
    }

    // Heuristic fit score calculation
    let calculatedFit = 75;
    if (role_type === 'founder') calculatedFit += 10;
    if (seniority === 'c-level' || seniority === 'partner') calculatedFit += 5;
    if (extracted.bio_notes.length > 50) calculatedFit += 5;
    calculatedFit = Math.min(calculatedFit, 96);

    const recordId = `ingest_${Date.now()}`;
    const newPerson = {
      source_record_id: recordId,
      name: extracted.name,
      email: extracted.email || null,
      email_normalized: emailNorm,
      company: extracted.company || null,
      role_title: extracted.role_title || null,
      bio_notes: extracted.bio_notes || null,
      source: extracted.source || 'webhook_ingest',
      role_type,
      seniority,
      sector_tags,
      community_fit_tags: ['active_applicant'],
      fit_score: calculatedFit,
      fit_score_reasoning: `Auto-evaluated from ${extracted.source}. ${role_type.toUpperCase()} profile with ${seniority} background.`,
      is_duplicate_of: is_dup_of,
      duplicate_confidence: dup_confidence,
      is_incomplete: !extracted.email || !extracted.role_title,
      missing_fields: [!extracted.email ? 'email' : null, !extracted.role_title ? 'role_title' : null].filter(Boolean),
      ai_enrichment_status: is_dup_of ? 'duplicate_flagged' : 'pending_enrichment',
      review_status: is_dup_of ? 'duplicate_review' : 'pending',
    };

    const { data, error } = await supabase
      .from('people')
      .insert([newPerson])
      .select()
      .single();

    if (error) {
      console.error('[INGEST ERROR]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Applicant successfully ingested into NetworkOS pipeline',
      record: data,
      duplicate_detected: is_dup_of !== null,
    });
  } catch (err: any) {
    console.error('[INGEST HANDLER ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to parse webhook payload' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/v1/ingest',
    supported_methods: ['POST'],
    payload_spec: {
      required: ['name'],
      optional: ['email', 'company', 'role_title', 'bio_notes', 'website', 'linkedin', 'source'],
    },
    integrations: ['Tally.so Webhooks', 'Typeform Webhooks', 'n8n Workflow Nodes', 'Zapier Catch Hook', 'Direct REST API'],
  });
}
