import type { Prisma } from '@prisma/client';
import { geoFromRequest, enrichGeoFromLocationCookie } from '@/lib/analytics/geo';
import { parsePageContext } from '@/lib/analytics/parse-page-context';
import { parseUserAgent } from '@/lib/analytics/ua-parse';
import {
  analyticsRateLimitKey,
  checkAnalyticsRateLimit,
  isLikelyBot,
} from '@/lib/analytics/rate-limit';
import type { AnalyticsCollectBody } from '@/lib/queue/schemas/analytics-collect';
import type { AnalyticsTelemetryMessage } from '@/lib/queue/schemas/analytics-collect';

export type CollectPayload = AnalyticsCollectBody;

export type AnalyticsGuardResult =
  | { ok: true; skip: true }
  | { ok: true; skip: false; payload: AnalyticsCollectBody }
  | { ok: false; status: number; error: string };

/** Fast synchronous guards before queueing or direct ingest. */
export function guardAnalyticsCollect(
  request: Request,
  payload: AnalyticsCollectBody
): AnalyticsGuardResult {
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
    return { ok: true, skip: true };
  }

  const rateKey = analyticsRateLimitKey(request, payload.visitorId);
  const rate = checkAnalyticsRateLimit(rateKey);
  if (!rate.ok) {
    return { ok: false, status: 429, error: 'Rate limit exceeded' };
  }

  return { ok: true, skip: false, payload };
}

/** CPU-only enrichment ? no database I/O. */
export async function enrichAnalyticsTelemetry(
  request: Request,
  payload: AnalyticsCollectBody
): Promise<AnalyticsTelemetryMessage> {
  const ua = request.headers.get('user-agent');
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

  return {
    ...payload,
    device: parsedUa.device,
    browser: parsedUa.browser,
    os: parsedUa.os,
    country: geo.country,
    province: geo.province,
    city: geo.city,
    dimensions,
    eventProperties,
    enrichedAt: new Date().toISOString(),
  };
}
