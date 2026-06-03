import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { storeCallInvite, clearCallInvite } from '@/lib/voice/call-invite-store';
import { publishCallInvite } from '@/lib/voice/publish-call-invite';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: callId } = await params;
    const body = await request.json();
    const sdpOffer = body?.sdpOffer as RTCSessionDescriptionInit | undefined;

    if (!sdpOffer?.type || !sdpOffer?.sdp) {
      return NextResponse.json({ error: 'sdpOffer required' }, { status: 400 });
    }

    const call = await db.voiceCall.findUnique({
      where: { id: callId },
      include: {
        caller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }

    if (call.callerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (call.status !== 'RINGING') {
      return NextResponse.json({ error: 'تماس دیگر در حال زنگ خوردن نیست' }, { status: 409 });
    }

    const offerJson = JSON.stringify(sdpOffer);

    await db.voiceCall.update({
      where: { id: callId },
      data: { signalingOffer: offerJson },
    });

    await storeCallInvite(callId, sdpOffer);

    await publishCallInvite({
      callId,
      calleeId: call.calleeId,
      callerId: call.callerId,
      sdpOffer,
      from: call.caller,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/calls/[id]/invite error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: callId } = await params;
    const call = await db.voiceCall.findUnique({ where: { id: callId } });
    if (!call) {
      return NextResponse.json({ ok: true });
    }

    if (call.callerId !== user.id && call.calleeId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await clearCallInvite(callId);
    await db.voiceCall.update({
      where: { id: callId },
      data: { signalingOffer: null },
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/calls/[id]/invite error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
