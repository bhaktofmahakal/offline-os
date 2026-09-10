import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let payload: any = null;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const rawPayload = formData.get('payload');
      if (rawPayload && typeof rawPayload === 'string') {
        payload = JSON.parse(rawPayload);
      }
    } else {
      payload = await request.json();
    }

    if (!payload || !payload.actions || payload.actions.length === 0) {
      return NextResponse.json({ message: 'No action specified' }, { status: 400 });
    }

    const action = payload.actions[0];
    const actionId = action.action_id;
    const memberId = action.value ? parseInt(action.value, 10) : null;
    const user = payload.user?.username || payload.user?.name || 'Operator';

    // 1. APPROVE & WELCOME ACTION
    if (actionId === 'approve_welcome' && memberId) {
      if (supabase) {
        await supabase
          .from('people')
          .update({
            review_status: 'approved',
            updated_at: new Date().toISOString(),
          })
          .eq('id', memberId);
      }

      return NextResponse.json({
        response_type: 'in_channel',
        replace_original: false,
        text: `✅ *VIP Member #${memberId} approved and welcomed by @${user}!* Welcome onboarding sequence initiated.`,
      });
    }

    // 2. SUGGEST INTRO ACTION
    if (actionId === 'suggest_intro' && memberId) {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: `🤝 *Intro suggestions queued for Member #${memberId}*. Review and dispatch bilateral intros in NetworkOS Console: https://offline-os-gray.vercel.app`,
      });
    }

    // 3. REVIEW DUPLICATE ACTION
    if (actionId === 'review_duplicate') {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: `⚠️ *Opening Duplicates Queue in NetworkOS Console...* View and adjudicate pairs: https://offline-os-gray.vercel.app`,
      });
    }

    return NextResponse.json({
      message: `Action ${actionId} processed successfully`,
    });
  } catch (err: any) {
    console.error('Slack Action Handler Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process Slack interactive action' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/slack/actions',
    supported_actions: ['approve_welcome', 'suggest_intro', 'review_duplicate'],
  });
}
