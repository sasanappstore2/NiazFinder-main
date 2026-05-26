import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type CallAction = 'accept' | 'reject' | 'end';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action as CallAction;

    const call = await db.voiceCall.findUnique({ where: { id } });
    if (!call) {
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }

    if (call.callerId !== user.id && call.calleeId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    if (action === 'accept' && call.calleeId === user.id) {
      const updated = await db.voiceCall.update({
        where: { id },
        data: { status: 'ACTIVE', startedAt: now },
      });
      return NextResponse.json({ call: updated });
    }

    if (action === 'reject') {
      const updated = await db.voiceCall.update({
        where: { id },
        data: { status: 'REJECTED', endedAt: now },
      });
      return NextResponse.json({ call: updated });
    }

    if (action === 'end') {
      const durationSec =
        call.status === 'ACTIVE'
          ? Math.max(0, Math.floor((now.getTime() - call.startedAt.getTime()) / 1000))
          : null;
      const updated = await db.voiceCall.update({
        where: { id },
        data: {
          status: 'ENDED',
          endedAt: now,
          durationSec: durationSec ?? undefined,
        },
      });
      return NextResponse.json({ call: updated });
    }

    return NextResponse.json({ error: 'action نامعتبر' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/calls/[id] error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
