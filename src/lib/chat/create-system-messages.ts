import { db } from '@/lib/db';
import type { MessageType } from '@prisma/client';

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  lastMessagePreview?: string;
}

/** Create a message and update conversation preview (server-side, no auth). */
export async function createSystemMessage(input: CreateMessageInput) {
  const preview = input.lastMessagePreview ?? input.content.trim().slice(0, 200);

  return db.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        content: input.content,
        type: input.type ?? 'TEXT',
        isRead: false,
      },
    });

    await tx.conversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessage: preview,
        lastMessageAt: new Date(),
      },
    });

    return message;
  });
}

/** Find or create conversation between two users, optionally scoped to a need. */
export async function ensureConversation(params: {
  userId1: string;
  userId2: string;
  requestId?: string;
  businessProfileId?: string;
}) {
  const { userId1, userId2, requestId, businessProfileId } = params;
  const [a, b] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  const existing = await db.conversation.findFirst({
    where: {
      userId1: a,
      userId2: b,
      ...(requestId ? { requestId } : {}),
      ...(businessProfileId ? { businessProfileId } : {}),
    },
  });

  if (existing) return existing;

  return db.conversation.create({
    data: {
      userId1: a,
      userId2: b,
      requestId: requestId ?? null,
      businessProfileId: businessProfileId ?? null,
    },
  });
}
