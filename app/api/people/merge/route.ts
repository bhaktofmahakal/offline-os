import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { canonicalId, duplicateId } = body;

    if (!canonicalId || !duplicateId) {
      return NextResponse.json(
        { error: 'Both canonicalId and duplicateId are required.' },
        { status: 400 }
      );
    }

    if (canonicalId === duplicateId) {
      return NextResponse.json(
        { error: 'Cannot merge a record into itself.' },
        { status: 400 }
      );
    }

    // 1. Fetch both records from Supabase
    const { data: records, error: fetchError } = await supabase
      .from('people')
      .select('*')
      .in('id', [canonicalId, duplicateId]);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!records || records.length < 2) {
      return NextResponse.json(
        { error: 'One or both member records were not found in the database.' },
        { status: 404 }
      );
    }

    const canonical = records.find(r => r.id === canonicalId);
    const duplicate = records.find(r => r.id === duplicateId);

    if (!canonical || !duplicate) {
      return NextResponse.json(
        { error: 'Unable to resolve canonical and duplicate records.' },
        { status: 404 }
      );
    }

    // 2. Intelligent Data Consolidation Engine
    // A. Sector Tags Union (clean, case-insensitive, deduplicated)
    const existingTags = Array.isArray(canonical.sector_tags) ? canonical.sector_tags : [];
    const dupTags = Array.isArray(duplicate.sector_tags) ? duplicate.sector_tags : [];
    const tagMap = new Map<string, string>();
    [...existingTags, ...dupTags].forEach(t => {
      if (typeof t === 'string' && t.trim()) {
        const clean = t.trim().toLowerCase();
        if (!tagMap.has(clean)) {
          tagMap.set(clean, t.trim());
        }
      }
    });
    const mergedSectorTags = Array.from(tagMap.values());

    // B. Community Fit Tags Union
    const existingFitTags = Array.isArray(canonical.community_fit_tags) ? canonical.community_fit_tags : [];
    const dupFitTags = Array.isArray(duplicate.community_fit_tags) ? duplicate.community_fit_tags : [];
    const mergedCommunityTags = Array.from(new Set([...existingFitTags, ...dupFitTags].filter(Boolean)));

    // C. Contact & Company Details (preserve canonical, fill missing from duplicate)
    const mergedEmail = (canonical.email && canonical.email.trim())
      ? canonical.email.trim()
      : (duplicate.email ? duplicate.email.trim() : null);

    const mergedCompany = (canonical.company && canonical.company.trim())
      ? canonical.company.trim()
      : (duplicate.company ? duplicate.company.trim() : null);

    const mergedRoleTitle = (canonical.role_title && canonical.role_title.trim())
      ? canonical.role_title.trim()
      : (duplicate.role_title ? duplicate.role_title.trim() : null);

    const mergedRoleType = canonical.role_type || duplicate.role_type || 'founder';
    const mergedSeniority = canonical.seniority || duplicate.seniority || 'senior';

    // D. Bio Notes Enrichment
    let mergedBio = canonical.bio_notes || '';
    if (!mergedBio.trim() && duplicate.bio_notes) {
      mergedBio = duplicate.bio_notes;
    } else if (duplicate.bio_notes && duplicate.bio_notes.trim() && !mergedBio.includes(duplicate.bio_notes.trim())) {
      if (mergedBio.length < 50 && duplicate.bio_notes.length > 50) {
        mergedBio = duplicate.bio_notes;
      } else {
        mergedBio = `${mergedBio.trim()} [Consolidated from #${duplicate.id}: ${duplicate.bio_notes.trim()}]`;
      }
    }

    // E. Fit Score Consolidation (Take highest evaluated score)
    const canonicalScore = typeof canonical.fit_score === 'number' ? canonical.fit_score : 0;
    const dupScore = typeof duplicate.fit_score === 'number' ? duplicate.fit_score : 0;
    const mergedFitScore = Math.max(canonicalScore, dupScore);
    const mergedFitReasoning = dupScore > canonicalScore && duplicate.fit_score_reasoning
      ? duplicate.fit_score_reasoning
      : (canonical.fit_score_reasoning || duplicate.fit_score_reasoning || 'Evaluated rubric consolidated.');

    // F. Re-evaluate Profile Completeness
    const missing: string[] = [];
    if (!mergedEmail) missing.push('email');
    if (!mergedRoleTitle) missing.push('role_title');
    const is_incomplete = missing.length > 0;

    // G. Source Payload Merge (preserve social links, LinkedIn, Twitter, etc.)
    const mergedSourcePayload = {
      ...(typeof duplicate.source_payload === 'object' ? duplicate.source_payload : {}),
      ...(typeof canonical.source_payload === 'object' ? canonical.source_payload : {}),
      consolidated_from_duplicate_id: duplicate.id,
      consolidated_at: new Date().toISOString(),
    };

    // 3. Atomically Update Canonical in Supabase
    const canonicalUpdatePayload = {
      email: mergedEmail,
      email_normalized: mergedEmail ? mergedEmail.toLowerCase() : null,
      company: mergedCompany,
      role_title: mergedRoleTitle,
      role_type: mergedRoleType,
      seniority: mergedSeniority,
      bio_notes: mergedBio || null,
      sector_tags: mergedSectorTags,
      community_fit_tags: mergedCommunityTags,
      fit_score: mergedFitScore,
      fit_score_reasoning: mergedFitReasoning,
      is_incomplete,
      missing_fields: missing,
      source_payload: mergedSourcePayload,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedCanonical, error: canonicalUpdateErr } = await supabase
      .from('people')
      .update(canonicalUpdatePayload)
      .eq('id', canonicalId)
      .select()
      .single();

    if (canonicalUpdateErr) {
      return NextResponse.json({ error: `Failed to update canonical: ${canonicalUpdateErr.message}` }, { status: 500 });
    }

    // 4. Update Duplicate Record to Merged Status
    const duplicateUpdatePayload = {
      is_duplicate_of: canonicalId,
      duplicate_confidence: 1.0,
      review_status: 'merged',
      updated_at: new Date().toISOString(),
    };

    const { data: updatedDuplicate, error: duplicateUpdateErr } = await supabase
      .from('people')
      .update(duplicateUpdatePayload)
      .eq('id', duplicateId)
      .select()
      .single();

    if (duplicateUpdateErr) {
      return NextResponse.json({ error: `Failed to update duplicate: ${duplicateUpdateErr.message}` }, { status: 500 });
    }

    // 5. Relink Associated Introductions (Zero Lost Network Connections)
    await supabase
      .from('introductions')
      .update({ person_a_id: canonicalId })
      .eq('person_a_id', duplicateId);

    await supabase
      .from('introductions')
      .update({ person_b_id: canonicalId })
      .eq('person_b_id', duplicateId);

    return NextResponse.json({
      success: true,
      canonical: updatedCanonical,
      duplicate: updatedDuplicate,
      summary: {
        canonicalId,
        duplicateId,
        mergedSectorTags,
        fitScore: mergedFitScore,
        is_incomplete,
      },
    });
  } catch (err: any) {
    console.error('API /api/people/merge error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
