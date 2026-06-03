const buckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;

export function checkAnalyticsRateLimit(key: string): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= MAX_PER_WINDOW) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { ok: true };
}

export function analyticsRateLimitKey(request: Request, visitorId?: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  return `analytics:${visitorId ?? ip}`;
}

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('bot') ||
    ua.includes('crawl') ||
    ua.includes('spider') ||
    ua.includes('headless') ||
    ua.includes('lighthouse') ||
    ua.includes('curl/') ||
    ua.includes('wget/')
  );
}
