import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const STALE_RINGING_MS = 2 * 60 * 1000;

/** Active RINGING call for callee — used when socket reconnects after invite fanout. */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const call = await db.voiceCall.findFirst({
      where: {
        calleeId: user.id,
        status: 'RINGING',
      },
      orderBy: { startedAt: 'desc' },
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
      return NextResponse.json({ call: null });
    }

    const ageMs = Date.now() - call.startedAt.getTime();
    if (ageMs > STALE_RINGING_MS) {
      return NextResponse.json({ call: null });
    }

    let sdpOffer: RTCSessionDescriptionInit | null = null;
    if (call.signalingOffer) {
      try {
        sdpOffer = JSON.parse(call.signalingOffer) as RTCSessionDescriptionInit;
      } catch {
        sdpOffer = null;
      }
    }

    return NextResponse.json({
      call: {
        callId: call.id,
        callerId: call.callerId,
        sdpOffer,
        from: call.caller,
      },
    });
  } catch (error) {
    console.error('GET /api/calls/incoming error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
