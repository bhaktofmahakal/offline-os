import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Safe CSV cell escaping utility for standard RFC 4180 CSVs
function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '""';
  if (Array.isArray(val)) {
    return `"${val.join('; ').replace(/"/g, '""')}"`;
  }
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'members';
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const role = searchParams.get('role') || 'ALL';
    const sector = searchParams.get('sector') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const id = searchParams.get('id');
    const dupFilter = searchParams.get('dupFilter') || 'PENDING';
    const today = new Date().toISOString().slice(0, 10);

    // ─────────────────────────────────────────────────────────────
    // 1. EXPORT TYPE: MEMBERS DIRECTORY / INDIVIDUAL LEAD
    // ─────────────────────────────────────────────────────────────
    if (type === 'members' || type === 'member') {
      const { data: people, error } = await supabase
        .from('people')
        .select('*')
        .order('id', { ascending: false })
        .range(0, 9999);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      let filtered = people || [];

      // Single Lead Export by ID
      if (id) {
        filtered = filtered.filter((p) => String(p.id) === String(id));
      }

      // Apply server-side filters if requested
      if (search) {
        filtered = filtered.filter((p) => {
          const matchName = (p.name || '').toLowerCase().includes(search);
          const matchCompany = (p.company || '').toLowerCase().includes(search);
          const matchRole = (p.role_title || '').toLowerCase().includes(search);
          const matchSectors = (p.sector_tags || []).some((t: string) => t.toLowerCase().includes(search));
          return matchName || matchCompany || matchRole || matchSectors;
        });
      }

      if (role !== 'ALL') {
        filtered = filtered.filter((p) => (p.role_type || '').toUpperCase() === role.toUpperCase());
      }

      if (sector !== 'ALL') {
        filtered = filtered.filter((p) => (p.sector_tags || []).includes(sector.toLowerCase()));
      }

      if (status === 'CANONICAL') {
        filtered = filtered.filter((p) => p.is_duplicate_of === null && !p.is_incomplete);
      } else if (status === 'DUPLICATE' || status === 'DUPLICATES') {
        filtered = filtered.filter((p) => p.is_duplicate_of !== null);
      } else if (status === 'INCOMPLETE') {
        filtered = filtered.filter((p) => p.is_incomplete);
      }

      const singleName = filtered.length === 1 && filtered[0].name
        ? filtered[0].name.toLowerCase().replace(/[^a-z0-9]/g, '_')
        : null;

      const filename = singleName
        ? `offline_crm_lead_${filtered[0].id}_${singleName}_${today}`
        : `offline_crm_members_${today}`;

      if (format === 'json') {
        const jsonContent = JSON.stringify(filtered, null, 2);
        const jsonBuffer = Buffer.from(jsonContent, 'utf-8');
        return new NextResponse(jsonBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.json"; filename*=UTF-8''${encodeURIComponent(filename)}.json`,
            'Content-Length': String(jsonBuffer.length),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }

      // Format CSV
      const headers = [
        'ID',
        'Name',
        'Email',
        'Normalized Email',
        'Company',
        'Role Title',
        'Role Type',
        'Seniority',
        'Sector Tags',
        'Community Fit Tags',
        'Fit Score',
        'Fit Score Reasoning',
        'Status',
        'Is Incomplete',
        'Missing Fields',
        'Bio Notes',
        'Source'
      ];

      const rows = filtered.map((p) => [
        p.id,
        escapeCSV(p.name),
        escapeCSV(p.email),
        escapeCSV(p.email_normalized || p.email),
        escapeCSV(p.company),
        escapeCSV(p.role_title),
        escapeCSV(p.role_type),
        escapeCSV(p.seniority),
        escapeCSV(p.sector_tags),
        escapeCSV(p.community_fit_tags),
        p.fit_score !== null ? p.fit_score : '',
        escapeCSV(p.fit_score_reasoning),
        escapeCSV(p.is_duplicate_of !== null ? `Duplicate of #${p.is_duplicate_of}` : (p.is_incomplete ? 'Incomplete' : 'Canonical')),
        p.is_incomplete ? 'TRUE' : 'FALSE',
        escapeCSV(p.missing_fields),
        escapeCSV(p.bio_notes),
        escapeCSV(p.source)
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const csvBuffer = Buffer.from(csvContent, 'utf-8');

      return new NextResponse(csvBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"; filename*=UTF-8''${encodeURIComponent(filename)}.csv`,
          'Content-Length': String(csvBuffer.length),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. EXPORT TYPE: DUPLICATES REVIEW QUEUE
    // ─────────────────────────────────────────────────────────────
    if (type === 'duplicates') {
      const { data: people, error } = await supabase
        .from('people')
        .select('*')
        .order('id', { ascending: false })
        .range(0, 9999);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const allPeople = people || [];
      const peopleById = new Map(allPeople.map((p) => [p.id, p]));
      const duplicateRecords = allPeople.filter((p) => p.is_duplicate_of !== null);

      let pairs = duplicateRecords.map((dup) => ({
        duplicate: dup,
        canonical: dup.is_duplicate_of ? peopleById.get(dup.is_duplicate_of) : null,
      }));

      if (dupFilter === 'PENDING') {
        pairs = pairs.filter((p) => p.duplicate.review_status !== 'merged');
      } else if (dupFilter === 'MERGED') {
        pairs = pairs.filter((p) => p.duplicate.review_status === 'merged');
      }

      const filename = `offline_crm_duplicates_${dupFilter.toLowerCase()}_${today}`;

      if (format === 'json') {
        const jsonContent = JSON.stringify(pairs, null, 2);
        const jsonBuffer = Buffer.from(jsonContent, 'utf-8');
        return new NextResponse(jsonBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.json"; filename*=UTF-8''${encodeURIComponent(filename)}.json`,
            'Content-Length': String(jsonBuffer.length),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }

      const headers = [
        'Duplicate Record ID',
        'Duplicate Name',
        'Duplicate Email',
        'Duplicate Company',
        'Duplicate Role',
        'Match Confidence',
        'Canonical Record ID',
        'Canonical Name',
        'Canonical Email',
        'Canonical Company',
        'Canonical Role',
        'Review Status',
        'AI Adjudication Rationale',
        'Duplicate Bio',
        'Canonical Bio'
      ];

      const rows = pairs.map(({ duplicate, canonical }) => {
        const isMerged = duplicate.review_status === 'merged';
        return [
          duplicate.id,
          escapeCSV(duplicate.name),
          escapeCSV(duplicate.email_normalized || duplicate.email),
          escapeCSV(duplicate.company),
          escapeCSV(duplicate.role_title),
          `${Math.round((duplicate.duplicate_confidence || 1.0) * 100)}%`,
          canonical ? canonical.id : (duplicate.is_duplicate_of || ''),
          escapeCSV(canonical?.name || ''),
          escapeCSV(canonical?.email_normalized || canonical?.email || ''),
          escapeCSV(canonical?.company || ''),
          escapeCSV(canonical?.role_title || ''),
          escapeCSV(isMerged ? 'Merged into Canonical' : 'Pending Review'),
          escapeCSV(duplicate.duplicate_confidence === 1.0 ? 'AI Deduplication Engine: Identity match with identical email and company affiliation.' : 'AI Deduplication Engine: Ambiguous profile match adjudicated with high confidence.'),
          escapeCSV(duplicate.bio_notes),
          escapeCSV(canonical?.bio_notes || '')
        ];
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const csvBuffer = Buffer.from(csvContent, 'utf-8');

      return new NextResponse(csvBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"; filename*=UTF-8''${encodeURIComponent(filename)}.csv`,
          'Content-Length': String(csvBuffer.length),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. EXPORT TYPE: INTRODUCTIONS WORKSPACE
    // ─────────────────────────────────────────────────────────────
    if (type === 'introductions') {
      const { data: intros, error: introErr } = await supabase
        .from('introductions')
        .select('*')
        .order('id', { ascending: false })
        .range(0, 9999);

      if (introErr) {
        return NextResponse.json({ error: introErr.message }, { status: 500 });
      }

      const { data: people } = await supabase
        .from('people')
        .select('id, name, company, role_title, email, email_normalized')
        .range(0, 9999);

      const peopleById = new Map((people || []).map((p) => [p.id, p]));

      const enrichedIntros = (intros || []).map((intro) => ({
        ...intro,
        person_a: peopleById.get(intro.person_a_id) || { name: 'Unknown Member' },
        person_b: peopleById.get(intro.person_b_id) || { name: 'Unknown Member' },
      }));

      const filename = `offline_crm_intros_${today}`;

      if (format === 'json') {
        const jsonContent = JSON.stringify(enrichedIntros, null, 2);
        const jsonBuffer = Buffer.from(jsonContent, 'utf-8');
        return new NextResponse(jsonBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.json"; filename*=UTF-8''${encodeURIComponent(filename)}.json`,
            'Content-Length': String(jsonBuffer.length),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }

      const headers = [
        'Intro ID',
        'Status',
        'Match Score',
        'Match Band',
        'Member A Name',
        'Member A Company',
        'Member A Role',
        'Member A Email',
        'Member B Name',
        'Member B Company',
        'Member B Role',
        'Member B Email',
        'Shared Context',
        'Suggested Icebreaker Draft',
        'AI Synergy Rationale'
      ];

      const rows = enrichedIntros.map((i: any) => [
        i.id,
        escapeCSV(i.status),
        `${Math.round(i.match_score * 100)}%`,
        escapeCSV(i.match_band),
        escapeCSV(i.person_a?.name),
        escapeCSV(i.person_a?.company),
        escapeCSV(i.person_a?.role_title),
        escapeCSV(i.person_a?.email_normalized || i.person_a?.email),
        escapeCSV(i.person_b?.name),
        escapeCSV(i.person_b?.company),
        escapeCSV(i.person_b?.role_title),
        escapeCSV(i.person_b?.email_normalized || i.person_b?.email),
        escapeCSV(i.shared_context),
        escapeCSV(i.suggested_intro),
        escapeCSV(i.reasoning)
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const csvBuffer = Buffer.from(csvContent, 'utf-8');

      return new NextResponse(csvBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"; filename*=UTF-8''${encodeURIComponent(filename)}.csv`,
          'Content-Length': String(csvBuffer.length),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return NextResponse.json({ error: `Unknown export type: ${type}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
