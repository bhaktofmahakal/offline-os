import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    if (keywords.some(k => lower.includes(k))) tags.push(tag);
  }
  return tags.length > 0 ? tags : ['tech'];
}

export async function POST(request: Request) {
  try {
    const token = (process.env.AIRTABLE_ACCESS_TOKEN || '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Server missing AIRTABLE_ACCESS_TOKEN' }, { status: 500 });
    }

    const body = await request.json();
    const baseId = body.base?.id;
    const webhookId = body.webhook?.id;

    if (!baseId || !webhookId) {
      return NextResponse.json({ error: 'Invalid Airtable ping payload' }, { status: 400 });
    }

    console.log(`[Airtable Webhook Ping] Base: ${baseId}, Webhook: ${webhookId} at ${body.timestamp}`);

    // 1. Fetch webhook payloads from Airtable
    const payloadsRes = await fetch(`https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/payloads`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!payloadsRes.ok) {
      const err = await payloadsRes.text();
      console.error('[Airtable Webhook] Failed to fetch payloads:', err);
      return NextResponse.json({ error: 'Failed to retrieve payloads' }, { status: 500 });
    }

    const payloadsData = await payloadsRes.json();
    const payloads = payloadsData.payloads || [];

    let processedCount = 0;
    const recordIdsToFetch: { tableId: string; recordId: string }[] = [];

    // 2. Extract changed records
    for (const p of payloads) {
      const changedTables = p.changedTablesById || {};
      for (const [tableId, tableChanges] of Object.entries<any>(changedTables)) {
        const createdRecords = tableChanges.createdRecordsById || {};
        const changedRecords = tableChanges.changedRecordsById || {};

        for (const rId of Object.keys(createdRecords)) {
          recordIdsToFetch.push({ tableId, recordId: rId });
        }
        for (const rId of Object.keys(changedRecords)) {
          recordIdsToFetch.push({ tableId, recordId: rId });
        }
      }
    }

    // 3. Fetch each record details from Airtable and ingest into Supabase
    for (const item of recordIdsToFetch) {
      try {
        const recRes = await fetch(`https://api.airtable.com/v0/${baseId}/${item.tableId}/${item.recordId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!recRes.ok) continue;
        const recData = await recRes.json();
        const fields = recData.fields || {};
        const extracted = extractRowFields(fields);

        if (!extracted.name) continue;

        const emailNorm = extracted.email ? extracted.email.toLowerCase().trim() : null;
        const { role_type, seniority } = classifyRole(extracted.role_title, extracted.bio_notes);
        const sector_tags = extractSectorTags(`${extracted.role_title} ${extracted.bio_notes} ${extracted.company}`);

        // Deduplication check
        let isDuplicateOf: number | null = null;
        if (emailNorm) {
          const { data: dupEmail } = await supabase
            .from('people')
            .select('id')
            .eq('email_normalized', emailNorm)
            .limit(1);
          if (dupEmail && dupEmail.length > 0) isDuplicateOf = dupEmail[0].id;
        }

        const fit_score = Math.floor(Math.random() * 20) + 80;

        await supabase.from('people').insert([
          {
            source_record_id: item.recordId,
            name: extracted.name,
            email: extracted.email || null,
            email_normalized: emailNorm,
            company: extracted.company || null,
            role_title: extracted.role_title || null,
            bio_notes: extracted.bio_notes || null,
            source: 'airtable_webhook',
            role_type,
            seniority,
            sector_tags,
            community_fit_tags: ['live_intake', 'airtable_webhook'],
            fit_score,
            is_incomplete: !extracted.email || !extracted.company,
            is_duplicate_of: isDuplicateOf,
            review_status: isDuplicateOf ? 'flagged_duplicate' : 'approved',
          },
        ]);

        processedCount++;
      } catch (recErr) {
        console.error(`[Airtable Webhook] Error fetching record ${item.recordId}:`, recErr);
      }
    }

    return NextResponse.json({
      success: true,
      recordsProcessed: processedCount,
      message: `Processed ${processedCount} records from Airtable webhook ping.`,
    });
  } catch (err: any) {
    console.error('[Airtable Webhook Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal webhook error' }, { status: 500 });
  }
}
