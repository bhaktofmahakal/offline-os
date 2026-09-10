import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const token = (process.env.AIRTABLE_ACCESS_TOKEN || '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Server missing AIRTABLE_ACCESS_TOKEN' }, { status: 500 });
    }

    const body = await request.json();
    const { baseId, tableIdOrName, recordId, fields } = body;

    if (!baseId || !tableIdOrName || !recordId || !fields) {
      return NextResponse.json(
        { error: 'baseId, tableIdOrName, recordId, and fields are required' },
        { status: 400 }
      );
    }

    const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Airtable Writeback failed (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      record: data,
      message: `Airtable record ${recordId} successfully enriched & updated in Base ${baseId}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update Airtable record' }, { status: 500 });
  }
}
