import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 1. GET: Fetch recent intelligence operations & audit records
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100);

    let query = supabase
      .from('intelligence_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type && ['search', 'deep_research', 'crawl', 'extract'].includes(type)) {
      query = query.eq('record_type', type);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { records: data || [] },
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

// 2. POST: Store an intelligence operation record in Supabase
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      record_type,
      title,
      query_or_url,
      parameters = {},
      results_count = 0,
      content = null,
      payload = {},
      status = 'completed',
    } = body;

    if (!record_type || !['search', 'deep_research', 'crawl', 'extract'].includes(record_type)) {
      return NextResponse.json({ error: 'Valid record_type is required' }, { status: 400 });
    }

    if (!query_or_url || typeof query_or_url !== 'string') {
      return NextResponse.json({ error: 'query_or_url string is required' }, { status: 400 });
    }

    const newRecord = {
      record_type,
      title: title || `${record_type.toUpperCase()}: ${query_or_url.slice(0, 50)}`,
      query_or_url,
      parameters,
      results_count: Number(results_count) || 0,
      content: content ? String(content) : null,
      payload: payload || {},
      status: ['completed', 'failed', 'running', 'pending'].includes(status) ? status : 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('intelligence_records')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.error('[INTELLIGENCE RECORD INSERT ERROR]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, record: data });
  } catch (err: any) {
    console.error('[INTELLIGENCE RECORD ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. DELETE: Remove a record from history
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing record id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('intelligence_records')
      .delete()
      .eq('id', Number(id));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: Number(id) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
