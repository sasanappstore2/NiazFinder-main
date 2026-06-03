import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const STALE_RINGING_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const since = new Date(Date.now() - STALE_RINGING_MS);

    const ringing = await db.voiceCall.findMany({
      where: {
        calleeId: user.id,
        status: 'RINGING',
        startedAt: { gte: since },
      },
      orderBy: { startedAt: 'desc' },
      take: 3,
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

    const calls = ringing.map((call) => {
      let sdpOffer: RTCSessionDescriptionInit | null = null;
      if (call.signalingOffer) {
        try {
          sdpOffer = JSON.parse(call.signalingOffer) as RTCSessionDescriptionInit;
        } catch {
          sdpOffer = null;
        }
      }
      return {
        callId: call.id,
        sdpOffer,
        from: {
          id: call.caller.id,
          firstName: call.caller.firstName,
          lastName: call.caller.lastName,
          displayName: call.caller.displayName ?? undefined,
          avatar: call.caller.avatar ?? undefined,
        },
      };
    });

    return NextResponse.json({ calls });
  } catch (error) {
    console.error('GET /api/calls/incoming error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
