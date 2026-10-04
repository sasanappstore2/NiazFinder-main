import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { publishCommEvent } from '@/lib/communication/redis-publish';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messageId } = await params;
  const body = (await request.json().catch(() => ({}))) as { unstar?: boolean };
  const unstar = Boolean(body.unstar);

  const message = await db.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });
  if (!message || message.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const conv = message.conversation;
  if (conv.userId1 !== user.id && conv.userId2 !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (unstar) {
    await db.messageStar.deleteMany({
      where: { messageId, userId: user.id },
    });
  } else {
    await db.messageStar.upsert({
      where: { messageId_userId: { messageId, userId: user.id } },
      create: { messageId, userId: user.id },
      update: {},
    });
  }

  void publishCommEvent({
    type: 'message:star',
    payload: {
      messageId,
      conversationId: message.conversationId,
      userId: user.id,
      isStarred: !unstar,
    },
  });

  return NextResponse.json({ ok: true, isStarred: !unstar });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messageId } = await params;
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (
    message.conversation.userId1 !== user.id &&
    message.conversation.userId2 !== user.id
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.messageStar.deleteMany({ where: { messageId, userId: user.id } });

  void publishCommEvent({
    type: 'message:star',
    payload: {
      messageId,
      conversationId: message.conversationId,
      userId: user.id,
      isStarred: false,
    },
  });

  return NextResponse.json({ ok: true, isStarred: false });
}
