import { NextResponse } from 'next/server';
import { getTavilyClient } from '@/lib/tavily';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 1. CREATE A RESEARCH TASK
export async function POST(request: Request) {
  try {
    const client = getTavilyClient();
    const body = await request.json();
    const { input, model = 'mini' } = body;

    if (!input || typeof input !== 'string' || !input.trim()) {
      return NextResponse.json({ error: 'Research task input/prompt is required' }, { status: 400 });
    }

    const response = await client.research(input.trim(), {
      model: model === 'pro' ? 'pro' : 'mini',
    });

    const resData = response as any;
    const requestId = resData.requestId || resData.request_id;

    return NextResponse.json({
      success: true,
      requestId,
      status: resData.status || 'pending',
      input,
      model,
      message: 'Autonomous research task initiated. Poll status with GET /api/tavily/research?requestId=' + requestId,
    });
  } catch (err: any) {
    console.error('Tavily Research Initiation Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initiate Tavily research task' },
      { status: 500 }
    );
  }
}

// 2. POLL RESEARCH TASK STATUS & RETRIEVE CITED REPORT
export async function GET(request: Request) {
  try {
    const client = getTavilyClient();
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'requestId query parameter is required' }, { status: 400 });
    }

    const response = await client.getResearch(requestId);
    const resData = response as any;

    return NextResponse.json({
      success: true,
      status: resData.status,
      content: resData.content || null,
      sources: resData.sources || [],
      subtopics: resData.subtopics || [],
      responseTime: resData.responseTime || null,
    });
  } catch (err: any) {
    console.error('Tavily Research Status Polling Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to poll Tavily research status' },
      { status: 500 }
    );
  }
}
