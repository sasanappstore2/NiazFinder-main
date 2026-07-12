import { NextRequest, NextResponse } from 'next/server';
import { runVipBroadcast } from '@/lib/smart-matching/vip-broadcast';
import { scheduleNeedExpiry } from '@/lib/smart-matching/need-visibility';
import { getSmartMatchingInternalSecret } from '@/lib/smart-matching/env';
import { verifyInternalSecretValue } from '@/lib/security/internal-secret';

function verifyInternal(request: NextRequest): NextResponse | null {
  const expected = getSmartMatchingInternalSecret();
  if (!expected) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  const secret = request.headers.get('X-Internal-Secret');
  if (!verifyInternalSecretValue(secret, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = verifyInternal(request);
  if (authError) return authError;
  const { id } = await context.params;
  const result = await runVipBroadcast(id);
  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = verifyInternal(request);
  if (authError) return authError;
  const { id } = await context.params;
  await scheduleNeedExpiry(id);
  return NextResponse.json({ ok: true });
}
