import { NextResponse } from 'next/server';
import { getTavilyClient } from '@/lib/tavily';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const client = getTavilyClient();
    const body = await request.json();
    const {
      url,
      limit = 20,
      maxDepth = 1,
      maxBreadth = 20,
      extractDepth = 'advanced',
      format = 'markdown',
      selectPaths,
      selectDomains,
      excludePaths,
      excludeDomains,
      instructions,
    } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'Valid URL is required to crawl' }, { status: 400 });
    }

    const options: any = {
      limit: Math.min(Math.max(Number(limit) || 20, 1), 50),
      maxDepth: Math.min(Math.max(Number(maxDepth) || 1, 1), 3),
      maxBreadth: Math.min(Math.max(Number(maxBreadth) || 20, 1), 30),
      extractDepth,
      format,
    };

    if (Array.isArray(selectPaths) && selectPaths.length > 0) options.selectPaths = selectPaths;
    if (Array.isArray(selectDomains) && selectDomains.length > 0) options.selectDomains = selectDomains;
    if (Array.isArray(excludePaths) && excludePaths.length > 0) options.excludePaths = excludePaths;
    if (Array.isArray(excludeDomains) && excludeDomains.length > 0) options.excludeDomains = excludeDomains;
    if (instructions && typeof instructions === 'string') options.instructions = instructions.trim();

    const response = await client.crawl(url.trim(), options);

    const formattedResults = (response.results || []).map((r: any) => ({
      url: r.url,
      rawContent: r.rawContent,
    }));

    // Persist crawl record in Supabase intelligence_records
    try {
      await supabase.from('intelligence_records').insert([
        {
          record_type: 'crawl',
          title: `Site Crawler: ${url.trim().slice(0, 80)}`,
          query_or_url: url.trim(),
          parameters: { limit, maxDepth, maxBreadth, extractDepth, format },
          results_count: formattedResults.length,
          content: formattedResults.map((r: any) => `## Page: ${r.url}\n${(r.rawContent || '').slice(0, 500)}...`).join('\n\n'),
          payload: { results: formattedResults, baseUrl: response.baseUrl || url },
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (logErr) {
      console.warn('[CRAWL LOGGING WARNING]', logErr);
    }

    return NextResponse.json({
      success: true,
      baseUrl: response.baseUrl || url,
      responseTime: response.responseTime,
      results: formattedResults,
    });
  } catch (err: any) {
    console.error('Tavily Crawl Error:', err);
    return NextResponse.json(
      { error: err.message || 'Tavily website crawl failed' },
      { status: 500 }
    );
  }
}
