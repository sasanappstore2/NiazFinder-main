'use client';

import { getAnalyticsLocationContext } from '@/lib/analytics/client-location';

const VISITOR_COOKIE = 'nf_vid';
const SESSION_COOKIE = 'nf_sid';
const SESSION_MS = 30 * 60 * 1000;

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
}

export function getVisitorId(): string {
  let id = readCookie(VISITOR_COOKIE);
  if (!id) {
    id = randomId();
    writeCookie(VISITOR_COOKIE, id, 365 * 24 * 60 * 60);
  }
  return id;
}

export function getSessionId(): string {
  let id = readCookie(SESSION_COOKIE);
  if (!id) {
    id = randomId();
    writeCookie(SESSION_COOKIE, id, SESSION_MS / 1000);
  } else {
    writeCookie(SESSION_COOKIE, id, SESSION_MS / 1000);
  }
  return id;
}

export type AnalyticsCollectPayload = {
  sessionId: string;
  visitorId: string;
  type: 'page_view' | 'event';
  path: string;
  title?: string;
  referrer?: string;
  durationMs?: number;
  name?: string;
  properties?: Record<string, unknown>;
  utm?: Record<string, string | undefined>;
  userId?: string;
  consent: boolean;
  userLocation?: { province?: string; city?: string; citySlug?: string };
  selectedCitySlug?: string;
};

export function sendAnalytics(payload: AnalyticsCollectPayload): void {
  if (!payload.consent) return;

  const loc = getAnalyticsLocationContext();
  const body = JSON.stringify({
    ...payload,
    userLocation: payload.userLocation ?? loc.userLocation,
    selectedCitySlug: payload.selectedCitySlug ?? loc.selectedCitySlug,
  });
  const url = '/api/analytics/collect';

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon(url, blob)) return;
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function trackPageView(options: {
  path: string;
  title?: string;
  consent: boolean;
  userId?: string;
  durationMs?: number;
  userLocation?: { province?: string; city?: string };
}): void {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  sendAnalytics({
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    type: 'page_view',
    path: options.path,
    title: options.title ?? (typeof document !== 'undefined' ? document.title : undefined),
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    durationMs: options.durationMs,
    consent: options.consent,
    userId: options.userId,
    userLocation: options.userLocation,
    utm: {
      source: params.get('utm_source') ?? undefined,
      medium: params.get('utm_medium') ?? undefined,
      campaign: params.get('utm_campaign') ?? undefined,
      content: params.get('utm_content') ?? undefined,
      term: params.get('utm_term') ?? undefined,
    },
  });
}

export function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
  options?: { consent?: boolean; userId?: string; path?: string }
): void {
  const consent = options?.consent ?? false;
  if (!consent) return;

  sendAnalytics({
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    type: 'event',
    name,
    path: options?.path ?? (typeof window !== 'undefined' ? window.location.pathname : '/'),
    properties,
    consent,
    userId: options?.userId,
  });
}
