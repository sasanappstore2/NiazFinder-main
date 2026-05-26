import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { canUsersVoiceCall } from '@/lib/voice/can-call';
import { getIceServers } from '@/lib/voice/ice-servers';

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

    const activeRinging = await db.voiceCall.findFirst({
      where: {
        status: 'RINGING',
        OR: [
          { callerId: user.id, calleeId },
          { callerId: calleeId, calleeId: user.id },
        ],
      },
    });
    if (activeRinging) {
      return NextResponse.json(
        { error: 'تماس دیگری در جریان است' },
        { status: 409 }
      );
    }

    const call = await db.voiceCall.create({
      data: {
        callerId: user.id,
        calleeId,
        conversationId: conversationId ?? sharedConvId ?? null,
        status: 'RINGING',
      },
    });

    const iceServers = getIceServers();

    return NextResponse.json({
      callId: call.id,
      conversationId: call.conversationId,
      iceServers,
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
