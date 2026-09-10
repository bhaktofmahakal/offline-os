import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const token = (process.env.AIRTABLE_ACCESS_TOKEN || '').trim();
    if (!token) {
      return NextResponse.json(
        { error: 'AIRTABLE_ACCESS_TOKEN is not configured in server environment' },
        { status: 500 }
      );
    }

    const res = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Airtable API error (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      bases: data.bases || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch Airtable bases' },
      { status: 500 }
    );
  }
}
