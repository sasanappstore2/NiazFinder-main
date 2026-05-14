import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST /api/calls - initiate a voice call
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { calleeId } = await request.json();
    if (!calleeId) {
      return NextResponse.json({ error: 'شناسه گیرنده الزامی است' }, { status: 400 });
    }
    if (calleeId === authUser.id) {
      return NextResponse.json({ error: 'نمی‌توانید با خودتان تماس بگیرید' }, { status: 400 });
    }

    const callee = await db.user.findFirst({ where: { id: calleeId } });
    if (!callee) {
      return NextResponse.json({ error: 'گیرنده یافت نشد' }, { status: 404 });
    }

    // Check for existing active call between these users
    const existingCall = await db.voiceCall.findFirst({
      where: {
        OR: [
          { callerId: authUser.id, calleeId, status: 'ringing' },
          { callerId: authUser.id, calleeId, status: 'connected' },
          { callerId: calleeId, calleeId: authUser.id, status: 'ringing' },
          { callerId: calleeId, calleeId: authUser.id, status: 'connected' },
        ],
      },
    });
    if (existingCall) {
      return NextResponse.json({
        error: 'یک تماس فعال وجود دارد',
        callId: existingCall.id,
        status: existingCall.status,
      }, { status: 409 });
    }

    const call = await db.voiceCall.create({
      data: { callerId: authUser.id, calleeId },
      include: {
        caller: { select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true } },
        callee: { select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true } },
      },
    });

    return NextResponse.json({
      id: call.id,
      status: call.status,
      caller: call.caller,
      callee: call.callee,
      createdAt: call.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Call create error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// GET /api/calls - get call history
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calls = await db.voiceCall.findMany({
      where: {
        OR: [{ callerId: authUser.id }, { calleeId: authUser.id }],
      },
      include: {
        caller: { select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true } },
        callee: { select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      data: calls.map(c => ({
        ...c,
        duration: c.duration || 0,
      })),
    });
  } catch (error) {
    console.error('Call history error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// PATCH /api/calls/[id] would be at /api/calls/[id]/route.ts - handle status updates
