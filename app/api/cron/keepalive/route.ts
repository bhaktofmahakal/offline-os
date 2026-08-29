import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {};

  // 1. Ping Render Python Pipeline API
  try {
    const renderRes = await fetch('https://offline-os.onrender.com/health', {
      cache: 'no-store',
      headers: { 'User-Agent': 'Offline-OS-KeepAlive/1.0' },
    });
    results.render_pipeline = {
      status: renderRes.status,
      ok: renderRes.ok,
    };
  } catch (err: any) {
    results.render_pipeline = { error: err.message };
  }

  // 2. Ping n8n Webhook / Instance
  try {
    const n8nRes = await fetch('https://n8n-render-utsav.onrender.com', {
      cache: 'no-store',
      headers: { 'User-Agent': 'Offline-OS-KeepAlive/1.0' },
    });
    results.n8n_instance = {
      status: n8nRes.status,
      ok: n8nRes.ok,
    };
  } catch (err: any) {
    results.n8n_instance = { error: err.message };
  }

  return NextResponse.json({
    status: 'keepalive_executed',
    timestamp: new Date().toISOString(),
    results,
  });
}
