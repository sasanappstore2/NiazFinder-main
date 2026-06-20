import { NextRequest, NextResponse } from 'next/server';
import { guardAnalyticsCollect, enrichAnalyticsTelemetry } from '@/lib/analytics/prepare-telemetry';
import { ingestAnalyticsEvent } from '@/lib/analytics/ingest-sync';
import { analyticsCollectSchema } from '@/lib/queue/schemas/analytics-collect';
import { publishAnalyticsTelemetry, rabbitMQEnabled } from '@/lib/queue/rabbitmq-client';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8_192;

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const raw = await request.json();
    const parsed = analyticsCollectSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const guard = guardAnalyticsCollect(request, parsed.data);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    if (guard.skip) {
      return NextResponse.json({ accepted: true }, { status: 202 });
    }

    if (!rabbitMQEnabled()) {
      const sync = await ingestAnalyticsEvent(request, guard.payload);
      if (!sync.ok) {
        return NextResponse.json({ error: sync.error }, { status: sync.status });
      }
      return NextResponse.json({ accepted: true });
    }

    const enriched = await enrichAnalyticsTelemetry(request, guard.payload);
    try {
      await publishAnalyticsTelemetry(enriched, {
        messageId: `${enriched.sessionId}:${Date.now()}`,
      });
      return NextResponse.json({ accepted: true }, { status: 202 });
    } catch (queueError) {
      console.warn('[analytics] queue publish failed, falling back to sync ingest', queueError);
      const sync = await ingestAnalyticsEvent(request, guard.payload);
      if (!sync.ok) {
        return NextResponse.json({ error: sync.error }, { status: sync.status });
      }
      return NextResponse.json({ accepted: true, syncFallback: true });
    }
  } catch (error) {
    console.error('Analytics collect error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
