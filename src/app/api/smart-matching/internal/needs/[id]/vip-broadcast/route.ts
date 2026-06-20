import { NextRequest, NextResponse } from 'next/server';
import { runVipBroadcast } from '@/lib/smart-matching/vip-broadcast';
import { scheduleNeedExpiry } from '@/lib/smart-matching/need-visibility';
import { getSmartMatchingInternalSecret } from '@/lib/smart-matching/env';

function verifyInternal(request: NextRequest) {
  const secret = request.headers.get('X-Internal-Secret');
  return secret === getSmartMatchingInternalSecret();
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifyInternal(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  const result = await runVipBroadcast(id);
  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifyInternal(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  await scheduleNeedExpiry(id);
  return NextResponse.json({ ok: true });
}
