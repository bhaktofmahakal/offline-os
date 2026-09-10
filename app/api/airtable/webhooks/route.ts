import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate and return auth token
function getAuthToken() {
  const token = (process.env.AIRTABLE_ACCESS_TOKEN || '').trim();
  if (!token) {
    throw new Error('AIRTABLE_ACCESS_TOKEN is not configured in server environment');
  }
  return token;
}

// 1. LIST ACTIVE WEBHOOKS FOR A BASE
export async function GET(request: Request) {
  try {
    const token = getAuthToken();
    const { searchParams } = new URL(request.url);
    const baseId = searchParams.get('baseId');

    if (!baseId) {
      return NextResponse.json({ error: 'baseId query param is required' }, { status: 400 });
    }

    const res = await fetch(`https://api.airtable.com/v0/bases/${baseId}/webhooks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Airtable Webhooks list error (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      webhooks: data.webhooks || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list webhooks' }, { status: 500 });
  }
}

// 2. CREATE A NEW WEBHOOK IN A BASE
export async function POST(request: Request) {
  try {
    const token = getAuthToken();
    const body = await request.json();
    const { baseId, notificationUrl, tableId } = body;

    if (!baseId) {
      return NextResponse.json({ error: 'baseId is required' }, { status: 400 });
    }

    // Determine notification URL (default to internal webhook receiver if not provided)
    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const finalNotificationUrl = notificationUrl || `${proto}://${host}/api/airtable/webhook-receiver`;

    const specification: any = {
      options: {
        filters: {
          dataTypes: ['tableData'],
        },
      },
    };

    if (tableId) {
      specification.options.filters.recordChangeScope = tableId;
    }

    const res = await fetch(`https://api.airtable.com/v0/bases/${baseId}/webhooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationUrl: finalNotificationUrl,
        specification,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Airtable Webhook creation failed (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      webhook: {
        id: data.id,
        expirationTime: data.expirationTime,
        macSecretBase64: data.macSecretBase64,
        notificationUrl: finalNotificationUrl,
      },
      message: 'Airtable webhook registered successfully. Expires in 7 days.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create webhook' }, { status: 500 });
  }
}

// 3. REFRESH A WEBHOOK'S 7-DAY EXPIRATION
export async function PATCH(request: Request) {
  try {
    const token = getAuthToken();
    const body = await request.json();
    const { baseId, webhookId } = body;

    if (!baseId || !webhookId) {
      return NextResponse.json({ error: 'baseId and webhookId are required' }, { status: 400 });
    }

    const res = await fetch(`https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Airtable Webhook refresh failed (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      expirationTime: data.expirationTime,
      message: `Webhook ${webhookId} refreshed! New expiration: ${data.expirationTime}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to refresh webhook' }, { status: 500 });
  }
}

// 4. DELETE / UNREGISTER A WEBHOOK
export async function DELETE(request: Request) {
  try {
    const token = getAuthToken();
    const { searchParams } = new URL(request.url);
    const baseId = searchParams.get('baseId');
    const webhookId = searchParams.get('webhookId');

    if (!baseId || !webhookId) {
      return NextResponse.json({ error: 'baseId and webhookId query parameters are required' }, { status: 400 });
    }

    const res = await fetch(`https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Failed to delete Airtable webhook (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Webhook ${webhookId} successfully deleted.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete webhook' }, { status: 500 });
  }
}
