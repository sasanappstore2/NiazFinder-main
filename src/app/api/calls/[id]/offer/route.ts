import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/** Callee fetches WebRTC offer while call is RINGING. */
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

    if (call.calleeId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (call.status !== 'RINGING') {
      return NextResponse.json({ sdpOffer: null, status: call.status });
    }

    if (!call.signalingOffer) {
      return NextResponse.json({ sdpOffer: null, status: call.status });
    }

    try {
      const sdpOffer = JSON.parse(call.signalingOffer) as RTCSessionDescriptionInit;
      return NextResponse.json({ sdpOffer, status: call.status });
    } catch {
      return NextResponse.json({ sdpOffer: null, status: call.status });
    }
  } catch (error) {
    console.error('GET /api/calls/[id]/offer error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
