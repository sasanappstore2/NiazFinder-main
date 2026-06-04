import { db } from '@/lib/db';
import { publishCommEvent } from '@/lib/communication/redis-publish';

export type PinMessageResult = {
  ok: true;
  isPinned: boolean;
  pinnedBy: string | null;
  pinnedAt: string | null;
};

export async function pinOrUnpinMessage(
  messageId: string,
  userId: string,
  unpin: boolean
): Promise<PinMessageResult> {
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });
  if (!message) {
    throw new Error('NOT_FOUND');
  }

  const conv = message.conversation;
  if (conv.userId1 !== userId && conv.userId2 !== userId) {
    throw new Error('FORBIDDEN');
  }

  if (message.deletedAt) {
    throw new Error('DELETED');
  }

  if (unpin) {
    await db.message.update({
      where: { id: messageId },
      data: { isPinned: false, pinnedBy: null, pinnedAt: null },
    });
  } else {
    await db.message.updateMany({
      where: { conversationId: message.conversationId, isPinned: true },
      data: { isPinned: false, pinnedBy: null, pinnedAt: null },
    });
    await db.message.update({
      where: { id: messageId },
      data: { isPinned: true, pinnedBy: userId, pinnedAt: new Date() },
    });
  }

  const pinnedAt = unpin ? null : new Date();
  void publishCommEvent({
    type: 'message:pin',
    payload: {
      messageId,
      conversationId: message.conversationId,
      isPinned: !unpin,
      pinnedBy: unpin ? null : userId,
      pinnedAt: pinnedAt?.toISOString() ?? null,
    },
  });

  return {
    ok: true,
    isPinned: !unpin,
    pinnedBy: unpin ? null : userId,
    pinnedAt: pinnedAt?.toISOString() ?? null,
  };
}
