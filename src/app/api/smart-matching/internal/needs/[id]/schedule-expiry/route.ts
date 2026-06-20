import { NextRequest, NextResponse } from 'next/server';
import { scheduleNeedExpiry } from '@/lib/smart-matching/need-visibility';
import { getSmartMatchingInternalSecret } from '@/lib/smart-matching/env';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const secret = request.headers.get('X-Internal-Secret');
  if (secret !== getSmartMatchingInternalSecret()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  await scheduleNeedExpiry(id);
  return NextResponse.json({ ok: true });
}
