import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'comms:voice:read');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const call = await db.voiceCall.findUnique({
      where: { id },
      select: {
        id: true,
        callerId: true,
        calleeId: true,
        conversationId: true,
        status: true,
        startedAt: true,
        endedAt: true,
        durationSec: true,
        janusRoomId: true,
        signalingOffer: true,
        signalingAnswer: true,
        caller: {
          select: { id: true, phone: true, displayName: true, firstName: true, lastName: true },
        },
        callee: {
          select: { id: true, phone: true, displayName: true, firstName: true, lastName: true },
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({
      call: {
        ...call,
        startedAt: call.startedAt.toISOString(),
        endedAt: call.endedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('Super admin voice-call GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
