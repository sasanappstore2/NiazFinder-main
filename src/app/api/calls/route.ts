import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { canUsersVoiceCall } from '@/lib/voice/can-call';
import { buildIceServersFromEnv } from '@/lib/voice/turn-credentials';
import { persistCallLogMessage } from '@/lib/voice/call-log-message';
import { fetchLivePresence } from '@/lib/chat/live-presence';
import { resolveUserOnline } from '@/lib/chat/resolve-online';

const STALE_RINGING_MS = 2 * 60 * 1000;

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatar: true,
} as const;

function existingCallPayload(
  call: {
    id: string;
    status: string;
    callerId: string;
    calleeId: string;
    caller: { id: string; firstName: string; lastName: string; displayName: string | null; avatar: string | null };
    callee: { id: string; firstName: string; lastName: string; displayName: string | null; avatar: string | null };
  },
  userId: string
) {
  const peer = call.callerId === userId ? call.callee : call.caller;
  return {
    callId: call.id,
    status: call.status,
    callType: call.callerId === userId ? ('outgoing' as const) : ('incoming' as const),
    peer: {
      id: peer.id,
      firstName: peer.firstName,
      lastName: peer.lastName,
      displayName: peer.displayName ?? undefined,
      avatar: peer.avatar ?? undefined,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const calleeId = typeof body.calleeId === 'string' ? body.calleeId : '';
    const conversationId =
      typeof body.conversationId === 'string' ? body.conversationId : undefined;

    if (!calleeId) {
      return NextResponse.json({ error: 'calleeId required' }, { status: 400 });
    }

    const { allowed, conversationId: sharedConvId } = await canUsersVoiceCall(
      user.id,
      calleeId
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'برای تماس ابتدا گفتگو با این کاربر داشته باشید' },
        { status: 403 }
      );
    }

    const inProgress = await db.voiceCall.findFirst({
      where: {
        status: { in: ['RINGING', 'ACTIVE'] },
        OR: [{ callerId: user.id }, { calleeId: user.id }],
      },
      include: {
        caller: { select: userSelect },
        callee: { select: userSelect },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (inProgress) {
      const ageMs = Date.now() - inProgress.startedAt.getTime();
      if (inProgress.status === 'RINGING' && ageMs > STALE_RINGING_MS) {
        const missed = await db.voiceCall.update({
          where: { id: inProgress.id },
          data: { status: 'MISSED', endedAt: new Date() },
        });
        void persistCallLogMessage(missed).catch((e) =>
          console.warn('[calls] persistCallLogMessage (stale ring) failed:', e)
        );
      } else {
        return NextResponse.json(
          {
            error: 'تماس دیگری در جریان است',
            existingCall: existingCallPayload(inProgress, user.id),
          },
          { status: 409 }
        );
      }
    }

    const callee = await db.user.findUnique({
      where: { id: calleeId },
      select: { online: true, lastSeenAt: true },
    });
    const livePresence = await fetchLivePresence([calleeId]);
    const calleeOnline = resolveUserOnline(calleeId, livePresence, {
      online: callee?.online,
      lastSeenAt: callee?.lastSeenAt?.toISOString() ?? null,
    });

    const calleeBusy = await db.voiceCall.findFirst({
      where: {
        status: { in: ['RINGING', 'ACTIVE'] },
        OR: [{ callerId: calleeId }, { calleeId }],
      },
    });
    if (calleeBusy) {
      return NextResponse.json(
        { error: 'طرف مقابل مشغول است', unavailableReason: 'busy' as const },
        { status: 422 }
      );
    }

    const call = await db.voiceCall.create({
      data: {
        callerId: user.id,
        calleeId,
        conversationId: conversationId ?? sharedConvId ?? null,
        status: 'RINGING',
      },
      include: {
        caller: { select: userSelect },
      },
    });

    const iceServers = buildIceServersFromEnv(user.id);

    return NextResponse.json({
      callId: call.id,
      conversationId: call.conversationId,
      iceServers,
      /** Hint for UI — call is always attempted; callee may still miss ring if socket is down. */
      calleePresence: calleeOnline ? ('online' as const) : ('offline' as const),
    });
  } catch (error) {
    console.error('POST /api/calls error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));

    const calls = await db.voiceCall.findMany({
      where: {
        OR: [{ callerId: user.id }, { calleeId: user.id }],
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        caller: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
        },
        callee: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ data: calls });
  } catch (error) {
    console.error('GET /api/calls error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
