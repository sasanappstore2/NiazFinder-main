import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';

const INTAKE_RATE_WINDOW_MS = 60_000;

/** Sliding-window limit for public intake endpoints (analyze, queue, telemetry). */
export function guardIntakePublicApi(
  request: NextRequest,
  scope: string,
  maxRequests = 90
): NextResponse | null {
  const ip = clientIp(request);
  const limit = checkRateLimit(`intake:${scope}:ip:${ip}`, maxRequests, INTAKE_RATE_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'تعداد درخواست بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.' },
      {
        status: 429,
        headers: limit.retryAfterSec
          ? { 'Retry-After': String(limit.retryAfterSec) }
          : undefined,
      }
    );
  }
  return null;
}
