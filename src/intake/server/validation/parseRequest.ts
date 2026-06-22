/**
 * Uniform request-body parsing for intake routes.
 *
 * Replaces the duplicated `await request.json().catch(() => null)` +
 * `schema.safeParse` + ad-hoc 400 blocks. Returns a discriminated result so the
 * route either gets typed `data` or a ready-to-return `NextResponse` (a uniform
 * 400 with field-level errors).
 */
import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType } from 'zod';

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonBody<T>(
  request: NextRequest,
  schema: ZodType<T>,
  opts?: { invalidMessage?: string },
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: opts?.invalidMessage ?? 'بدنه درخواست نامعتبر است', fieldErrors: {} },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: opts?.invalidMessage ?? 'داده‌های ارسالی نامعتبر است',
          fieldErrors: flat.fieldErrors,
        },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
