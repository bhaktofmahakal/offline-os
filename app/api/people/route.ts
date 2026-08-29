import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 1. GET: Fetch all member records
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('id', { ascending: false })
      .range(0, 999);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { people: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. POST: Create a new member manually (CRUD Create)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, role_title, bio_notes, role_type, seniority, sector_tags, fit_score } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newRecord: Record<string, any> = {
      source_record_id: `manual_${Date.now()}`,
      name: name.trim(),
      email: email ? email.trim() : null,
      email_normalized: email ? email.trim().toLowerCase() : null,
      company: company ? company.trim() : null,
      role_title: role_title ? role_title.trim() : null,
      bio_notes: bio_notes ? bio_notes.trim() : null,
      source: 'manual_operator_entry',
      role_type: role_type || 'founder',
      seniority: seniority || 'senior',
      sector_tags: Array.isArray(sector_tags) ? sector_tags : [],
      community_fit_tags: [],
      fit_score: fit_score !== undefined && fit_score !== null ? Number(fit_score) : 80,
      fit_score_reasoning: 'Direct operator entry into CRM.',
      is_duplicate_of: null,
      duplicate_confidence: null,
      is_incomplete: !email || !role_title,
      missing_fields: [!email ? 'email' : null, !role_title ? 'role_title' : null].filter(Boolean),
      ai_enrichment_status: 'manual_entry',
      review_status: 'approved',
    };

    const { data, error } = await supabase
      .from('people')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, member: data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. PATCH: Update any member fields or review status (CRUD Update)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (id === undefined) {
      return NextResponse.json({ error: 'Missing required field id' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};

    // Standard fields
    if (updateFields.name !== undefined) updatePayload.name = updateFields.name;
    if (updateFields.email !== undefined) {
      updatePayload.email = updateFields.email;
      updatePayload.email_normalized = updateFields.email ? updateFields.email.trim().toLowerCase() : null;
    }
    if (updateFields.company !== undefined) updatePayload.company = updateFields.company;
    if (updateFields.role_title !== undefined) updatePayload.role_title = updateFields.role_title;
    if (updateFields.bio_notes !== undefined) updatePayload.bio_notes = updateFields.bio_notes;
    if (updateFields.role_type !== undefined) updatePayload.role_type = updateFields.role_type;
    if (updateFields.seniority !== undefined) updatePayload.seniority = updateFields.seniority;
    if (updateFields.sector_tags !== undefined) updatePayload.sector_tags = updateFields.sector_tags;
    if (updateFields.fit_score !== undefined) updatePayload.fit_score = updateFields.fit_score;
    if (updateFields.fit_score_reasoning !== undefined) updatePayload.fit_score_reasoning = updateFields.fit_score_reasoning;

    // Deduplication & Review flags
    if (updateFields.is_duplicate_of !== undefined) updatePayload.is_duplicate_of = updateFields.is_duplicate_of;
    if (updateFields.duplicate_confidence !== undefined) updatePayload.duplicate_confidence = updateFields.duplicate_confidence;
    if (updateFields.review_status !== undefined) updatePayload.review_status = updateFields.review_status;

    // Update timestamp
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('people')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, updated: data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 4. DELETE: Delete / Archive a member record (CRUD Delete)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing query parameter id' }, { status: 400 });
    }

    const memberId = parseInt(id, 10);

    // Also remove any introductions linked to this member
    await supabase
      .from('introductions')
      .delete()
      .or(`person_a_id.eq.${memberId},person_b_id.eq.${memberId}`);

    // Delete person record from Supabase
    const { error } = await supabase
      .from('people')
      .delete()
      .eq('id', memberId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: memberId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
