import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'purge_live') {
      // Delete all manually added or webhook ingested members (keeping seed data or purging all if requested)
      const { error } = await supabase
        .from('people')
        .delete()
        .or('source.eq.webhook_ingest,source.eq.tally_webhook,source.eq.manual_operator_entry,source.eq.public_application_form');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Live workspace applications purged. Clean slate ready for fresh intake.',
      });
    }

    return NextResponse.json({ error: 'Invalid action. Supported: purge_live' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
