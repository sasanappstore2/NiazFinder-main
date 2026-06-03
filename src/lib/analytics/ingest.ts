import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { geoFromRequest, enrichGeoFromLocationCookie } from '@/lib/analytics/geo';
import { parsePageContext, parseUtm } from '@/lib/analytics/parse-page-context';
import { parseUserAgent } from '@/lib/analytics/ua-parse';
import {
  analyticsRateLimitKey,
  checkAnalyticsRateLimit,
  isLikelyBot,
} from '@/lib/analytics/rate-limit';

export type CollectPayload = {
  sessionId: string;
  visitorId: string;
  type: 'page_view' | 'event';
  path: string;
  title?: string;
  referrer?: string;
  durationMs?: number;
  name?: string;
  properties?: Record<string, unknown>;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  userId?: string;
  consent?: boolean;
  userLocation?: { province?: string; city?: string; citySlug?: string };
  selectedCitySlug?: string;
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export async function ingestAnalyticsEvent(
  request: Request,
  payload: CollectPayload
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!payload.consent) {
    return { ok: false, status: 403, error: 'Analytics consent required' };
  }

  if (!payload.sessionId || !payload.visitorId || !payload.path || !payload.type) {
    return { ok: false, status: 400, error: 'Invalid payload' };
  }

  if (payload.path.length > 2048) {
    return { ok: false, status: 400, error: 'Path too long' };
  }

  const ua = request.headers.get('user-agent');
  if (isLikelyBot(ua)) {
    return { ok: true };
  }

  const rateKey = analyticsRateLimitKey(request, payload.visitorId);
  const rate = checkAnalyticsRateLimit(rateKey);
  if (!rate.ok) {
    return { ok: false, status: 429, error: 'Rate limit exceeded' };
  }

  const parsedUa = parseUserAgent(ua);
  const dimensions = parsePageContext(payload.path) as Prisma.JsonObject;
  const urlCitySlug =
    payload.selectedCitySlug ??
    (typeof dimensions.citySlug === 'string' ? dimensions.citySlug : undefined);
  let geo = await geoFromRequest(request, urlCitySlug);
  geo = enrichGeoFromLocationCookie(geo, payload.userLocation);

  const eventProperties: Prisma.JsonObject = {
    ...(payload.properties ?? {}),
    geoSource: geo.geoSource,
    geoInferredProvince: geo.geoInferredProvince,
    geoInferredCity: geo.geoInferredCity,
    userSelectedCity: payload.userLocation?.city ?? payload.userLocation?.citySlug ?? null,
  };

  const utm = payload.utm ?? {};
  const now = new Date();

  const existing = await db.analyticsSession.findUnique({
    where: { sessionId: payload.sessionId },
  });

  const isNewSession =
    !existing || now.getTime() - existing.lastSeen.getTime() > SESSION_TIMEOUT_MS;

  if (!existing || isNewSession) {
    await db.analyticsSession.upsert({
      where: { sessionId: payload.sessionId },
      create: {
        sessionId: payload.sessionId,
        visitorId: payload.visitorId,
        userId: payload.userId ?? null,
        device: parsedUa.device,
        browser: parsedUa.browser,
        os: parsedUa.os,
        country: geo.country,
        province: geo.province,
        city: geo.city,
        ipHash: geo.ipHash,
        landingPath: payload.path,
        referrer: payload.referrer?.slice(0, 2048) ?? null,
        utmSource: utm.source ?? null,
        utmMedium: utm.medium ?? null,
        utmCampaign: utm.campaign ?? null,
        utmContent: utm.content ?? null,
        utmTerm: utm.term ?? null,
        pageViewCount: payload.type === 'page_view' ? 1 : 0,
        eventCount: payload.type === 'event' ? 1 : 0,
        totalDurationMs: payload.durationMs ?? 0,
      },
      update: isNewSession
        ? {
            visitorId: payload.visitorId,
            userId: payload.userId ?? existing?.userId ?? null,
            lastSeen: now,
            landingPath: payload.path,
            referrer: payload.referrer?.slice(0, 2048) ?? existing?.referrer ?? null,
            pageViewCount: payload.type === 'page_view' ? 1 : 0,
            eventCount: payload.type === 'event' ? 1 : 0,
            totalDurationMs: payload.durationMs ?? 0,
          }
        : {
            lastSeen: now,
            userId: payload.userId ?? existing?.userId ?? null,
          },
    });
  } else {
    await db.analyticsSession.update({
      where: { sessionId: payload.sessionId },
      data: {
        lastSeen: now,
        userId: payload.userId ?? existing.userId,
        pageViewCount:
          payload.type === 'page_view' ? { increment: 1 } : undefined,
        eventCount: payload.type === 'event' ? { increment: 1 } : undefined,
        totalDurationMs: payload.durationMs
          ? { increment: payload.durationMs }
          : undefined,
      },
    });
  }

  await db.analyticsEvent.create({
    data: {
      sessionId: payload.sessionId,
      visitorId: payload.visitorId,
      userId: payload.userId ?? null,
      type: payload.type,
      name: payload.name ?? (payload.type === 'page_view' ? 'page_view' : null),
      path: payload.path.slice(0, 2048),
      title: payload.title?.slice(0, 512) ?? null,
      referrer: payload.referrer?.slice(0, 2048) ?? null,
      durationMs: payload.durationMs ?? null,
      properties: eventProperties,
      dimensions,
      device: parsedUa.device,
      browser: parsedUa.browser,
      os: parsedUa.os,
      country: geo.country,
      province: geo.province,
      city: geo.city,
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
