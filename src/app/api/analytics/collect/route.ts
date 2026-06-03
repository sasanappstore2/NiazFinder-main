import { NextRequest, NextResponse } from 'next/server';
import { ingestAnalyticsEvent, type CollectPayload } from '@/lib/analytics/ingest';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8_192;

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = (await request.json()) as CollectPayload;
    const result = await ingestAnalyticsEvent(request, body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Analytics collect error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
