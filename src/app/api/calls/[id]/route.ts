import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// PATCH /api/calls/[id] - update call status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: callId } = await params;
    const { status, duration } = await request.json();

    const call = await db.voiceCall.findFirst({ where: { id: callId } });
    if (!call) {
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }

    const isParticipant = call.callerId === authUser.id || call.calleeId === authUser.id;
    if (!isParticipant && authUser.role !== 'ADMIN' && authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (duration !== undefined) updateData.duration = duration;
    if (status === 'connected') updateData.startedAt = new Date();
    if (status === 'ended' || status === 'missed' || status === 'rejected') {
      updateData.endedAt = new Date();
    }

    const updatedCall = await db.voiceCall.update({
      where: { id: callId },
      data: updateData,
    });

    return NextResponse.json({ success: true, call: updatedCall });
  } catch (error) {
    console.error('Call update error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
