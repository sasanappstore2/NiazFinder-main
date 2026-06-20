import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { parseUtm } from '@/lib/analytics/parse-page-context';
import type { CollectPayload } from '@/lib/analytics/prepare-telemetry';
import {
  enrichAnalyticsTelemetry,
  guardAnalyticsCollect,
} from '@/lib/analytics/prepare-telemetry';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Synchronous DB ingest ? used when RABBITMQ_ENABLED=false. */
export async function ingestAnalyticsEvent(
  request: Request,
  payload: CollectPayload
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const guard = guardAnalyticsCollect(request, payload);
  if (!guard.ok) {
    return { ok: false, status: guard.status, error: guard.error };
  }
  if (guard.skip) {
    return { ok: true };
  }

  const enriched = await enrichAnalyticsTelemetry(request, guard.payload);
  const utm = enriched.utm ?? {};
  const now = new Date();
  const dimensions = (enriched.dimensions ?? {}) as Prisma.JsonObject;
  const eventProperties = (enriched.eventProperties ?? {}) as Prisma.JsonObject;

  const existing = await db.analyticsSession.findUnique({
    where: { sessionId: enriched.sessionId },
  });

  const isNewSession =
    !existing || now.getTime() - existing.lastSeen.getTime() > SESSION_TIMEOUT_MS;

  if (!existing || isNewSession) {
    await db.analyticsSession.upsert({
      where: { sessionId: enriched.sessionId },
      create: {
        sessionId: enriched.sessionId,
        visitorId: enriched.visitorId,
        userId: enriched.userId ?? null,
        device: enriched.device ?? null,
        browser: enriched.browser ?? null,
        os: enriched.os ?? null,
        country: enriched.country ?? null,
        province: enriched.province ?? null,
        city: enriched.city ?? null,
        ipHash: null,
        landingPath: enriched.path,
        referrer: enriched.referrer?.slice(0, 2048) ?? null,
        utmSource: utm.source ?? null,
        utmMedium: utm.medium ?? null,
        utmCampaign: utm.campaign ?? null,
        utmContent: utm.content ?? null,
        utmTerm: utm.term ?? null,
        pageViewCount: enriched.type === 'page_view' ? 1 : 0,
        eventCount: enriched.type === 'event' ? 1 : 0,
        totalDurationMs: enriched.durationMs ?? 0,
      },
      update: isNewSession
        ? {
            visitorId: enriched.visitorId,
            userId: enriched.userId ?? existing?.userId ?? null,
            lastSeen: now,
            landingPath: enriched.path,
            referrer: enriched.referrer?.slice(0, 2048) ?? existing?.referrer ?? null,
            pageViewCount: enriched.type === 'page_view' ? 1 : 0,
            eventCount: enriched.type === 'event' ? 1 : 0,
            totalDurationMs: enriched.durationMs ?? 0,
          }
        : {
            lastSeen: now,
            userId: enriched.userId ?? existing?.userId ?? null,
          },
    });
  } else {
    await db.analyticsSession.update({
      where: { sessionId: enriched.sessionId },
      data: {
        lastSeen: now,
        userId: enriched.userId ?? existing.userId,
        pageViewCount: enriched.type === 'page_view' ? { increment: 1 } : undefined,
        eventCount: enriched.type === 'event' ? { increment: 1 } : undefined,
        totalDurationMs: enriched.durationMs ? { increment: enriched.durationMs } : undefined,
      },
    });
  }

  await db.analyticsEvent.create({
    data: {
      sessionId: enriched.sessionId,
      visitorId: enriched.visitorId,
      userId: enriched.userId ?? null,
      type: enriched.type,
      name: enriched.name ?? (enriched.type === 'page_view' ? 'page_view' : null),
      path: enriched.path.slice(0, 2048),
      title: enriched.title?.slice(0, 512) ?? null,
      referrer: enriched.referrer?.slice(0, 2048) ?? null,
      durationMs: enriched.durationMs ?? null,
      properties: eventProperties,
      dimensions,
      device: enriched.device ?? null,
      browser: enriched.browser ?? null,
      os: enriched.os ?? null,
      country: enriched.country ?? null,
      province: enriched.province ?? null,
      city: enriched.city ?? null,
    },
  });

  return { ok: true };
}

export function utmFromUrl(url: string): NonNullable<CollectPayload['utm']> {
  try {
    const params = new URL(url, 'http://local').searchParams;
    const parsed = parseUtm(params);
    return {
      source: parsed.utmSource,
      medium: parsed.utmMedium,
      campaign: parsed.utmCampaign,
      content: parsed.utmContent,
      term: parsed.utmTerm,
    };
  } catch {
    return {};
  }
}
