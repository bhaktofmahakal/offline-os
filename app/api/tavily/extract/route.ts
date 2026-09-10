import { NextResponse } from 'next/server';
import { getTavilyClient } from '@/lib/tavily';
import { supabase } from '@/lib/supabase';

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

    const formattedResults = (response.results || []).map((r: any) => ({
      url: r.url,
      rawContent: r.rawContent,
      images: r.images || [],
      favicon: r.favicon || null,
    }));

    // Persist extraction record in Supabase intelligence_records
    try {
      await supabase.from('intelligence_records').insert([
        {
          record_type: 'extract',
          title: `URL Extractor: ${cleanUrls[0]} ${cleanUrls.length > 1 ? `(+${cleanUrls.length - 1} more)` : ''}`,
          query_or_url: cleanUrls.join(', '),
          parameters: { extractDepth, format, count: cleanUrls.length },
          results_count: formattedResults.length,
          content: formattedResults.map((r: any) => `## Extracted: ${r.url}\n${(r.rawContent || '').slice(0, 500)}...`).join('\n\n'),
          payload: { results: formattedResults, failedResults: response.failedResults || [] },
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (logErr) {
      console.warn('[EXTRACT LOGGING WARNING]', logErr);
    }

    return NextResponse.json({
      success: true,
      responseTime: response.responseTime,
      results: formattedResults,
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
