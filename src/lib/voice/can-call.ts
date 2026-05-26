import { db } from '@/lib/db';

/** Users may call only if they share a conversation. */
export async function canUsersVoiceCall(
  callerId: string,
  calleeId: string
): Promise<{ allowed: boolean; conversationId?: string }> {
  if (callerId === calleeId) return { allowed: false };

  const conv = await db.conversation.findFirst({
    where: {
      OR: [
        { userId1: callerId, userId2: calleeId },
        { userId1: calleeId, userId2: callerId },
      ],
    },
    select: { id: true },
    orderBy: { lastMessageAt: 'desc' },
  });

  if (!conv) return { allowed: false };
  return { allowed: true, conversationId: conv.id };
}
