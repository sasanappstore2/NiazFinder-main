import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { INTAKE_MIGRATION_FEATURE_FLAGS } from '@/intake/migration/feature-flags';

const INTAKE_RATE_WINDOW_MS = 60_000;

/** Sliding-window limit for public intake endpoints (analyze, queue, telemetry). */
export function guardIntakePublicApi(
  request: NextRequest,
  scope: string,
  maxRequests = 90
): NextResponse | null {
  if (!INTAKE_MIGRATION_FEATURE_FLAGS.securityGuards) return null;
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

/** Reject oversized JSON before parsing it into memory. */
export function guardIntakePayloadSize(
  request: NextRequest,
  maxBytes = 256_000
): NextResponse | null {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return NextResponse.json(
      { error: 'حجم درخواست بیش از حد مجاز است', code: 'payload_too_large' },
      { status: 413 }
    );
  }
  return null;
}
