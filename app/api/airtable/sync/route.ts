import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Dynamic column mapping helper
function extractRowFields(fields: Record<string, any>) {
  const getFieldVal = (...candidateKeys: string[]): string => {
    for (const key of Object.keys(fields)) {
      const lowerKey = key.toLowerCase().trim();
      for (const candidate of candidateKeys) {
        if (lowerKey === candidate.toLowerCase() || lowerKey.includes(candidate.toLowerCase())) {
          const val = fields[key];
          if (val === null || val === undefined) return '';
          if (Array.isArray(val)) {
            return val.map(item => (typeof item === 'object' ? item.name || item.text || JSON.stringify(item) : String(item))).join(', ');
          }
          if (typeof val === 'object') {
            return val.name || val.text || val.value || JSON.stringify(val);
          }
          return String(val).trim();
        }
      }
    }
    return '';
  };

  return {
    name: getFieldVal('name', 'full name', 'founder name', 'applicant name', 'member'),
    email: getFieldVal('email', 'work email', 'contact email', 'e-mail'),
    company: getFieldVal('company', 'startup', 'organization', 'venture', 'firm'),
    role_title: getFieldVal('role', 'title', 'position', 'designation', 'job title'),
    bio_notes: getFieldVal('bio', 'notes', 'about', 'pitch', 'description', 'background'),
    website: getFieldVal('website', 'company url', 'domain', 'url'),
    linkedin: getFieldVal('linkedin', 'linkedin profile', 'profile'),
    twitter: getFieldVal('twitter', 'x handle', 'x profile'),
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
    const token = (process.env.AIRTABLE_ACCESS_TOKEN || '').trim();
    if (!token) {
      return NextResponse.json(
        { error: 'AIRTABLE_ACCESS_TOKEN is not configured in server environment' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { baseId, tableIdOrName, maxRecords = 200 } = body;

    if (!baseId || !tableIdOrName) {
      return NextResponse.json(
        { error: 'baseId and tableIdOrName are required' },
        { status: 400 }
      );
    }

    // 1. Fetch all records with cursor pagination
    let allAirtableRecords: any[] = [];
    let offset: string | null = null;
    let pageCount = 0;

    do {
      pageCount++;
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdOrName)}`);
      url.searchParams.set('pageSize', '100');
      if (offset) url.searchParams.set('offset', offset);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `Airtable fetch failed (status ${res.status}): ${errText}` },
          { status: res.status }
        );
      }

      const pageData = await res.json();
      const records = pageData.records || [];
      allAirtableRecords = allAirtableRecords.concat(records);

      offset = pageData.offset || null;

      // Rate limiting: sleep 200ms between pages if more exist
      if (offset && allAirtableRecords.length < maxRecords) {
        await new Promise(r => setTimeout(r, 200));
      }
    } while (offset && allAirtableRecords.length < maxRecords && pageCount < 10);

    // 2. Fetch existing people from Supabase for deduplication
    const { data: existingPeople } = await supabase
      .from('people')
      .select('id, name, email_normalized, company');

    const emailSet = new Map<string, number>();
    const nameCompanySet = new Map<string, number>();

    (existingPeople || []).forEach(p => {
      if (p.email_normalized) emailSet.set(p.email_normalized.toLowerCase(), p.id);
      if (p.name) {
        const key = `${p.name.toLowerCase().trim()}_${(p.company || '').toLowerCase().trim()}`;
        nameCompanySet.set(key, p.id);
      }
    });

    // 3. Process each record and insert into Supabase
    let newIngested = 0;
    let duplicatesDetected = 0;
    const processedLogs: string[] = [];

    for (const rec of allAirtableRecords) {
      const extracted = extractRowFields(rec.fields || {});
      if (!extracted.name) continue;

      const emailNorm = extracted.email ? extracted.email.toLowerCase().trim() : null;
      const nameKey = `${extracted.name.toLowerCase().trim()}_${extracted.company.toLowerCase().trim()}`;

      // Check duplicates
      let isDupOf: number | null = null;
      let dupConfidence: number | null = null;

      if (emailNorm && emailSet.has(emailNorm)) {
        isDupOf = emailSet.get(emailNorm)!;
        dupConfidence = 1.0;
      } else if (nameCompanySet.has(nameKey)) {
        isDupOf = nameCompanySet.get(nameKey)!;
        dupConfidence = 0.92;
      }

      const { role_type, seniority } = classifyRole(extracted.role_title, extracted.bio_notes);
      const sector_tags = extractSectorTags(`${extracted.role_title} ${extracted.company} ${extracted.bio_notes}`);

      let fitScore = 75;
      if (role_type === 'founder') fitScore += 10;
      if (seniority === 'c-level' || seniority === 'partner') fitScore += 5;
      if (extracted.bio_notes.length > 50) fitScore += 5;
      fitScore = Math.min(fitScore, 95);

      const recordToInsert = {
        source_record_id: rec.id || `airtable_${Date.now()}`,
        name: extracted.name,
        email: extracted.email || null,
        email_normalized: emailNorm,
        company: extracted.company || null,
        role_title: extracted.role_title || null,
        bio_notes: extracted.bio_notes || null,
        source: 'airtable_sync',
        role_type,
        seniority,
        sector_tags,
        community_fit_tags: ['airtable_synced'],
        fit_score: fitScore,
        fit_score_reasoning: `Ingested from Airtable base (${baseId}). ${role_type.toUpperCase()} profile with ${seniority} background.`,
        is_duplicate_of: isDupOf,
        duplicate_confidence: dupConfidence,
        is_incomplete: !extracted.email || !extracted.role_title,
        missing_fields: [!extracted.email ? 'email' : null, !extracted.role_title ? 'role_title' : null].filter(Boolean),
        ai_enrichment_status: isDupOf ? 'duplicate_flagged' : 'pending_enrichment',
        review_status: isDupOf ? 'duplicate_review' : 'approved',
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('people')
        .insert([recordToInsert])
        .select('id, name')
        .single();

      if (!insertErr && inserted) {
        if (emailNorm) emailSet.set(emailNorm, inserted.id);
        nameCompanySet.set(nameKey, inserted.id);

        if (isDupOf) {
          duplicatesDetected++;
          processedLogs.push(`⚠️ ${extracted.name} (${extracted.company || 'Indie'}): Duplicate of #${isDupOf}`);
        } else {
          newIngested++;
          processedLogs.push(`✨ ${extracted.name} (${extracted.company || 'Indie'}): Saved with fit score ${fitScore}/100`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Airtable sync complete: ${allAirtableRecords.length} records processed`,
      total_fetched: allAirtableRecords.length,
      new_ingested: newIngested,
      duplicates_detected: duplicatesDetected,
      logs: processedLogs,
    });
  } catch (err: any) {
    console.error('[AIRTABLE SYNC ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Airtable synchronization failed' },
      { status: 500 }
    );
  }
}
