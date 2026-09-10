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
      query,
      searchDepth = 'advanced',
      topic = 'general',
      maxResults = 5,
      includeDomains,
      excludeDomains,
      timeRange,
    } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const options: any = {
      searchDepth,
      topic,
      maxResults: Math.min(Math.max(Number(maxResults) || 5, 1), 20),
    };

    if (Array.isArray(includeDomains) && includeDomains.length > 0) {
      options.includeDomains = includeDomains;
    }
    if (Array.isArray(excludeDomains) && excludeDomains.length > 0) {
      options.excludeDomains = excludeDomains;
    }
    if (timeRange) {
      options.timeRange = timeRange;
    }

    const response = await client.search(query.trim(), options);

    const formattedResults = (response.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      publishedDate: r.publishedDate || null,
      favicon: r.favicon || null,
    }));

    // Persist search record in Supabase intelligence_records
    try {
      await supabase.from('intelligence_records').insert([
        {
          record_type: 'search',
          title: `Neural Search: ${query.trim().slice(0, 80)}`,
          query_or_url: query.trim(),
          parameters: { searchDepth, topic, maxResults, includeDomains, excludeDomains },
          results_count: formattedResults.length,
          content: formattedResults.map((r: any) => `### ${r.title}\n${r.url}\n${r.content}`).join('\n\n'),
          payload: { results: formattedResults, responseTime: response.responseTime },
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (logErr) {
      console.warn('[SEARCH LOGGING WARNING]', logErr);
    }

    return NextResponse.json({
      success: true,
      query: response.query || query,
      responseTime: response.responseTime,
      results: formattedResults,
    });
  } catch (err: any) {
    console.error('Tavily Search Error:', err);
    return NextResponse.json(
      { error: err.message || 'Tavily search execution failed' },
      { status: 500 }
    );
  }
}
