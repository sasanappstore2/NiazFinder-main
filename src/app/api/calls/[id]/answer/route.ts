import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/** Caller fetches WebRTC answer while call is ACTIVE. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const call = await db.voiceCall.findUnique({ where: { id } });

    if (!call) {
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }

    if (call.callerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (call.status !== 'ACTIVE') {
      return NextResponse.json({ sdpAnswer: null, status: call.status });
    }

    if (!call.signalingAnswer) {
      return NextResponse.json({ sdpAnswer: null, status: call.status });
    }

    try {
      const sdpAnswer = JSON.parse(call.signalingAnswer) as RTCSessionDescriptionInit;
      return NextResponse.json({ sdpAnswer, status: call.status });
    } catch {
      return NextResponse.json({ sdpAnswer: null, status: call.status });
    }
  } catch (error) {
    console.error('GET /api/calls/[id]/answer error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
