import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function PATCH(request: Request) {

  try {
    const body = await request.json();
    const { id, is_duplicate_of, duplicate_confidence } = body;

    if (id === undefined) {
      return NextResponse.json({ error: 'Missing required field id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('people')
      .update({
        is_duplicate_of: is_duplicate_of !== undefined ? is_duplicate_of : null,
        duplicate_confidence: duplicate_confidence !== undefined ? duplicate_confidence : null,
      })
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


