import { NextResponse } from 'next/server';
import { getTavilyClient } from '@/lib/tavily';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const client = getTavilyClient();
    const body = await request.json();
    const { url, limit = 50, maxDepth = 1, maxBreadth = 20 } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'Valid URL is required to map' }, { status: 400 });
    }

    const response = await client.map(url.trim(), {
      limit: Math.min(Math.max(Number(limit) || 50, 1), 100),
      maxDepth: Math.min(Math.max(Number(maxDepth) || 1, 1), 3),
      maxBreadth: Math.min(Math.max(Number(maxBreadth) || 20, 1), 30),
    });

    return NextResponse.json({
      success: true,
      baseUrl: response.baseUrl || url,
      responseTime: response.responseTime,
      results: response.results || [],
    });
  } catch (err: any) {
    console.error('Tavily Map Error:', err);
    return NextResponse.json(
      { error: err.message || 'Tavily website mapping failed' },
      { status: 500 }
    );
  }
}
