import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { SmartMatchingError } from '@/lib/smart-matching/errors';

export function smartMatchingErrorResponse(err: unknown) {
  if (err instanceof SmartMatchingError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  const prismaCode =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
  if (prismaCode === 'P2034') {
    return NextResponse.json(
      { error: 'Transaction conflict, please retry', code: 'TRANSACTION_CONFLICT' },
      { status: 503 }
    );
  }
  console.error(err);
  return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
}

export async function requireAuthUser(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'لطفاً وارد شوید' }, { status: 401 }) };
  }
  return { user, response: null };
}

export function getNestBaseUrl() {
  return (
    process.env.NEST_API_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_NEST_API_URL?.replace(/\/$/, '') ||
    ''
  );
}

export async function proxyToNest(
  request: NextRequest,
  path: string,
  init?: RequestInit
) {
  const base = getNestBaseUrl();
  if (!base) return null;

  const auth = request.headers.get('authorization');
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
