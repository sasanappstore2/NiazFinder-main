import { NextRequest, NextResponse } from 'next/server';
import { scheduleNeedExpiry } from '@/lib/smart-matching/need-visibility';
import { getSmartMatchingInternalSecret } from '@/lib/smart-matching/env';
import { verifyInternalSecretValue } from '@/lib/security/internal-secret';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const expected = getSmartMatchingInternalSecret();
  if (!expected) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  const secret = request.headers.get('X-Internal-Secret');
  if (!verifyInternalSecretValue(secret, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  await scheduleNeedExpiry(id);
  return NextResponse.json({ ok: true });
}
