import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export type InternalSecretCheck = 'ok' | 'unconfigured' | 'mismatch';

/** Constant-time compare for internal cron / worker routes. */
export function verifyInternalApiSecret(
  request: NextRequest,
  headerName = 'x-internal-secret'
): InternalSecretCheck {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) return 'unconfigured';
  const provided = request.headers.get(headerName) ?? '';
  if (provided.length !== secret.length) return 'mismatch';
  if (!timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) return 'mismatch';
  return 'ok';
}

export function verifyInternalSecretValue(
  provided: string | null | undefined,
  expected: string
): boolean {
  const value = provided ?? '';
  if (!expected || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
