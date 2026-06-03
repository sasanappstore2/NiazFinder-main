import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { publishCommEvent } from '@/lib/communication/redis-publish';
import { isAllowedReactionEmoji } from '@/lib/chat/reactions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messageId } = await params;
  const { emoji: rawEmoji } = (await request.json()) as { emoji?: string };
  const emoji = rawEmoji?.trim() ?? '';
  if (!isAllowedReactionEmoji(emoji)) {
    return NextResponse.json({ error: 'واکنش نامعتبر است' }, { status: 400 });
  }

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

  const existing = await db.messageReaction.findFirst({
    where: { messageId, userId: user.id },
  });

  let eventType: 'message:reaction-added' | 'message:reaction-updated' | 'message:reaction-removed' =
    'message:reaction-added';

  if (existing?.emoji === emoji) {
    await db.messageReaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.id,
          emoji,
        },
      },
    });
    eventType = 'message:reaction-removed';
  } else {
    await db.messageReaction.deleteMany({
      where: { messageId, userId: user.id },
    });
    await db.messageReaction.create({
      data: { messageId, userId: user.id, emoji },
    });
    eventType = existing ? 'message:reaction-updated' : 'message:reaction-added';
  }

  const reactions = await db.messageReaction.findMany({
    where: { messageId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
  });

  void publishCommEvent({
    type: 'message:react',
    payload: {
      messageId,
      conversationId: message.conversationId,
      userId: user.id,
      emoji,
      eventType,
    },
  });

  return NextResponse.json({
    ok: true,
    reactions: reactions.map((r) => ({
      emoji: r.emoji,
      userId: r.userId,
      user: r.user
        ? {
            id: r.user.id,
            firstName: r.user.firstName,
            lastName: r.user.lastName,
            avatar: r.user.avatar ?? undefined,
          }
        : undefined,
    })),
  });
}
