import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch intros
    const { data: intros, error: introErr } = await supabase
      .from('introductions')
      .select('*')
      .order('match_score', { ascending: false });

    if (introErr) {
      return NextResponse.json({ error: introErr.message }, { status: 500 });
    }

    // Fetch people to map person_a_id and person_b_id
    const { data: people } = await supabase
      .from('people')
      .select('id, source_record_id, name, company, role_title, role_type, seniority, sector_tags, community_fit_tags');

    const peopleById = new Map((people || []).map((p) => [p.id, p]));

    const enrichedIntros = (intros || []).map((intro) => {
      const personA = peopleById.get(intro.person_a_id);
      const personB = peopleById.get(intro.person_b_id);
      return {
        ...intro,
        person_a: personA || { name: 'Unknown Member' },
        person_b: personB || { name: 'Unknown Member' },
      };
    });

    return NextResponse.json({ introductions: enrichedIntros });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, reviewer_note } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields id and status' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('introductions')
      .update({
        status,
        reviewer_note: reviewer_note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();


    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
