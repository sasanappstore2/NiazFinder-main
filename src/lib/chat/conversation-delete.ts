import { db } from '@/lib/db';
import { publishCommEvent } from '@/lib/communication/redis-publish';

export type DeleteConversationResult =
  | { ok: true; conversationId: string; participantIds: [string, string] }
  | { ok: false; status: 403 | 404; error: string };

/**
 * Hard-delete a conversation for a participant. Both parties lose the thread.
 * Publishes realtime fanout so peers remove it from their inbox.
 */
export async function deleteConversationForUser(
  conversationId: string,
  userId: string
): Promise<DeleteConversationResult> {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userId1: true, userId2: true },
  });

  if (!conv) {
    return { ok: false, status: 404, error: 'گفتگو یافت نشد' };
  }

  if (conv.userId1 !== userId && conv.userId2 !== userId) {
    return { ok: false, status: 403, error: 'دسترسی ندارید' };
  }

  await db.conversation.delete({ where: { id: conversationId } });

  const participantIds: [string, string] = [conv.userId1, conv.userId2];

  void publishCommEvent({
    type: 'conversation:deleted',
    payload: {
      conversationId,
      deletedBy: userId,
      participantIds,
    },
  });

  return { ok: true, conversationId, participantIds };
}
