import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const token = (process.env.AIRTABLE_ACCESS_TOKEN || '').trim();
    if (!token) {
      return NextResponse.json(
        { error: 'AIRTABLE_ACCESS_TOKEN is not configured in server environment' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const baseId = searchParams.get('baseId');

    if (!baseId) {
      return NextResponse.json(
        { error: 'baseId query parameter is required' },
        { status: 400 }
      );
    }

    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Airtable Table Schema API error (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      tables: (data.tables || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        primaryFieldId: t.primaryFieldId,
        fields: (t.fields || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.type,
        })),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch Airtable table schemas' },
      { status: 500 }
    );
  }
}
