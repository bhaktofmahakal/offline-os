import { NextResponse } from 'next/server';
import { getTavilyClient } from '@/lib/tavily';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const client = getTavilyClient();
    const body = await request.json();
    const { urls, extractDepth = 'advanced', format = 'markdown' } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'Array of URLs is required' }, { status: 400 });
    }

    const cleanUrls = urls.map(u => String(u).trim()).filter(u => u.length > 0);
    if (cleanUrls.length === 0) {
      return NextResponse.json({ error: 'No valid URLs provided' }, { status: 400 });
    }

    const response = await client.extract(cleanUrls, {
      extractDepth,
      format,
    });

    return NextResponse.json({
      success: true,
      responseTime: response.responseTime,
      results: (response.results || []).map((r: any) => ({
        url: r.url,
        rawContent: r.rawContent,
        images: r.images || [],
        favicon: r.favicon || null,
      })),
      failedResults: response.failedResults || [],
    });
  } catch (err: any) {
    console.error('Tavily Extract Error:', err);
    return NextResponse.json(
      { error: err.message || 'Tavily extraction failed' },
      { status: 500 }
    );
  }
}
