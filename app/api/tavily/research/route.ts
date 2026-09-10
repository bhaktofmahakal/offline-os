import { NextResponse } from 'next/server';
import { getTavilyClient } from '@/lib/tavily';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 1. CREATE A RESEARCH TASK
export async function POST(request: Request) {
  try {
    const client = getTavilyClient();
    const body = await request.json();
    const { input, model = 'mini', personId } = body;

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
      personId: personId || null,
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
    const personId = searchParams.get('personId');

    if (!requestId) {
      return NextResponse.json({ error: 'requestId query parameter is required' }, { status: 400 });
    }

    const response = await client.getResearch(requestId);
    const resData = response as any;

    // If research completed, automatically persist to Supabase
    if (resData.status === 'completed' && resData.content) {
      const nowIso = new Date().toISOString();

      // If linked to a member, save to member's ai_classification.deep_memo
      if (personId) {
        try {
          const { data: currentPerson } = await supabase
            .from('people')
            .select('ai_classification, clean_summary')
            .eq('id', Number(personId))
            .single();

          if (currentPerson) {
            const updatedAi = {
              ...(typeof currentPerson.ai_classification === 'object' && currentPerson.ai_classification !== null ? currentPerson.ai_classification : {}),
              deep_memo: {
                content: resData.content,
                sources: resData.sources || [],
                subtopics: resData.subtopics || [],
                completed_at: nowIso,
              },
            };

            await supabase
              .from('people')
              .update({
                ai_classification: updatedAi,
                clean_summary: currentPerson.clean_summary || (resData.content.slice(0, 300) + '...'),
                updated_at: nowIso,
              })
              .eq('id', Number(personId));
          }
        } catch (memberErr) {
          console.warn('[PERSON RESEARCH PERSISTENCE WARNING]', memberErr);
        }
      }

      // Also persist to intelligence_records audit table
      try {
        await supabase.from('intelligence_records').insert([
          {
            record_type: 'deep_research',
            title: `Deep Research: ${requestId}`,
            query_or_url: requestId,
            parameters: { personId: personId || null, sourcesCount: (resData.sources || []).length },
            results_count: (resData.sources || []).length,
            content: resData.content,
            payload: { sources: resData.sources || [], subtopics: resData.subtopics || [] },
            status: 'completed',
            created_at: nowIso,
            updated_at: nowIso,
          },
        ]);
      } catch (logErr) {
        // avoid failing response if duplicate
      }
    }

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
