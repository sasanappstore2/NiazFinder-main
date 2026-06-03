import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  publishCallAccepted,
  publishCallHangup,
  publishCallReject,
} from '@/lib/voice/publish-call-signal';
import { buildIceServersFromEnv } from '@/lib/voice/turn-credentials';
import { persistCallLogMessage } from '@/lib/voice/call-log-message';

type CallAction = 'accept' | 'reject' | 'cancel' | 'end';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(_request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const call = await db.voiceCall.findUnique({ where: { id } });
    if (!call) {
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }

    if (call.callerId !== user.id && call.calleeId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      call: {
        id: call.id,
        status: call.status,
        callerId: call.callerId,
        calleeId: call.calleeId,
      },
      iceServers: buildIceServersFromEnv(user.id),
    });
  } catch (error) {
    console.error('GET /api/calls/[id] error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

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
    const sdpAnswer = body.sdpAnswer as RTCSessionDescriptionInit | undefined;

    const call = await db.voiceCall.findUnique({ where: { id } });
    if (!call) {
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }

    if (call.callerId !== user.id && call.calleeId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    if (action === 'accept') {
      if (call.calleeId !== user.id) {
        return NextResponse.json({ error: 'فقط گیرنده می‌تواند تماس را بپذیرد' }, { status: 403 });
      }
      if (call.status !== 'RINGING') {
        return NextResponse.json({ error: 'تماس دیگر در حال زنگ خوردن نیست' }, { status: 409 });
      }

      const answerJson =
        sdpAnswer?.type && sdpAnswer?.sdp ? JSON.stringify(sdpAnswer) : null;

      const updated = await db.voiceCall.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          startedAt: now,
          signalingOffer: null,
          signalingAnswer: answerJson,
        },
      });

      void publishCallAccepted({
        callId: id,
        targetUserId: call.callerId,
        sdpAnswer: sdpAnswer?.type && sdpAnswer?.sdp ? sdpAnswer : undefined,
      }).catch((e) => console.warn('[calls] publishCallAccepted failed:', e));

      return NextResponse.json({ call: updated });
    }

    if (action === 'reject') {
      if (call.calleeId !== user.id) {
        return NextResponse.json({ error: 'فقط گیرنده می‌تواند تماس را رد کند' }, { status: 403 });
      }
      if (call.status !== 'RINGING') {
        return NextResponse.json({ error: 'تماس دیگر در حال زنگ خوردن نیست' }, { status: 409 });
      }

      const updated = await db.voiceCall.update({
        where: { id },
        data: {
          status: 'REJECTED',
          endedAt: now,
          signalingOffer: null,
          signalingAnswer: null,
        },
      });
      void publishCallReject({
        callId: id,
        callerId: call.callerId,
        calleeId: call.calleeId,
      }).catch((e) => console.warn('[calls] publishCallReject failed:', e));
      void persistCallLogMessage(updated).catch((e) =>
        console.warn('[calls] persistCallLogMessage failed:', e)
      );
      return NextResponse.json({ call: updated });
    }

    if (action === 'cancel') {
      if (call.callerId !== user.id) {
        return NextResponse.json({ error: 'فقط تماس‌گیرنده می‌تواند لغو کند' }, { status: 403 });
      }
      if (call.status !== 'RINGING') {
        return NextResponse.json({ error: 'تماس دیگر در حال زنگ خوردن نیست' }, { status: 409 });
      }

      const updated = await db.voiceCall.update({
        where: { id },
        data: {
          status: 'ENDED',
          endedAt: now,
          signalingOffer: null,
          signalingAnswer: null,
        },
      });
      void publishCallHangup({ callId: id, targetUserId: call.calleeId }).catch((e) =>
        console.warn('[calls] publishCallHangup failed:', e)
      );
      void persistCallLogMessage(updated).catch((e) =>
        console.warn('[calls] persistCallLogMessage failed:', e)
      );
      return NextResponse.json({ call: updated });
    }

    if (action === 'end') {
      if (call.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'تماس فعال نیست' }, { status: 409 });
      }

      const durationSec = Math.max(
        0,
        Math.floor((now.getTime() - call.startedAt.getTime()) / 1000)
      );
      const updated = await db.voiceCall.update({
        where: { id },
        data: {
          status: 'ENDED',
          endedAt: now,
          durationSec,
          signalingOffer: null,
          signalingAnswer: null,
        },
      });
      const peerId = call.callerId === user.id ? call.calleeId : call.callerId;
      void publishCallHangup({ callId: id, targetUserId: peerId }).catch((e) =>
        console.warn('[calls] publishCallHangup failed:', e)
      );
      void persistCallLogMessage(updated).catch((e) =>
        console.warn('[calls] persistCallLogMessage failed:', e)
      );
      return NextResponse.json({ call: updated });
    }

    return NextResponse.json({ error: 'action نامعتبر' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/calls/[id] error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
