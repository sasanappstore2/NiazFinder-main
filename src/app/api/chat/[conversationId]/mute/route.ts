import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/** GET — mute state for current user on a conversation. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversationId } = await params;
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { userId1: true, userId2: true },
  });
  if (!conv || (conv.userId1 !== user.id && conv.userId2 !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const mute = await db.conversationMute.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
  });

  const muted =
    Boolean(mute) && (mute!.mutedUntil == null || mute!.mutedUntil > new Date());

  return NextResponse.json({
    muted,
    mutedUntil: mute?.mutedUntil?.toISOString() ?? null,
  });
}

/** PATCH — set or clear mute. Body: { muted: boolean, mutedUntil?: string | null } */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversationId } = await params;
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { userId1: true, userId2: true },
  });
  if (!conv || (conv.userId1 !== user.id && conv.userId2 !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    muted?: boolean;
    mutedUntil?: string | null;
  };

  if (body.muted === false) {
    await db.conversationMute.deleteMany({
      where: { conversationId, userId: user.id },
    });
    return NextResponse.json({ muted: false, mutedUntil: null });
  }

  const mutedUntil =
    typeof body.mutedUntil === 'string' && body.mutedUntil
      ? new Date(body.mutedUntil)
      : null;

  await db.conversationMute.upsert({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
    create: { conversationId, userId: user.id, mutedUntil },
    update: { mutedUntil },
  });

  return NextResponse.json({
    muted: true,
    mutedUntil: mutedUntil?.toISOString() ?? null,
  });
}
