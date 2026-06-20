import { db } from '@/lib/db';
import { ensureConversation, createSystemMessage } from '@/lib/chat/create-system-messages';
import { getPlatformAiUser, getPlatformAiUserId } from '@/lib/platform-ai/user';
import { hasCorruptedPersianPlaceholder } from '@/lib/persian-encoding-guard';

export const PLATFORM_BOT_WELCOME_MESSAGE =
  'سلام! من دستیار نیازفایندر هستم. چطور می‌تونم کمکتون کنم؟';

/** Ensures each user has a direct chat thread with the platform AI bot. */
export async function ensurePlatformAiConversationForUser(userId: string) {
  const platformAiId = await getPlatformAiUserId();
  const platformAi = await getPlatformAiUser();

  const conversation = await ensureConversation({
    userId1: userId,
    userId2: platformAiId,
  });

  const messageCount = await db.message.count({
    where: { conversationId: conversation.id },
  });

  if (messageCount === 0) {
    await createSystemMessage({
      conversationId: conversation.id,
      senderId: platformAiId,
      content: PLATFORM_BOT_WELCOME_MESSAGE,
      type: 'TEXT',
    });
  } else {
    const welcome = await db.message.findFirst({
      where: { conversationId: conversation.id, senderId: platformAiId, type: 'TEXT' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, content: true },
    });
    if (welcome && hasCorruptedPersianPlaceholder(welcome.content)) {
      await db.message.update({
        where: { id: welcome.id },
        data: { content: PLATFORM_BOT_WELCOME_MESSAGE },
      });
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: PLATFORM_BOT_WELCOME_MESSAGE.slice(0, 200),
          lastMessageAt: new Date(),
        },
      });
    }
  }

  const refreshed = await db.conversation.findUniqueOrThrow({
    where: { id: conversation.id },
    include: {
      messages: {
        where: { senderId: { not: userId }, isRead: false },
        select: { id: true },
      },
    },
  });

  return {
    conversation: refreshed,
    platformAi,
    unreadCount: refreshed.messages.length,
  };
}

export function isPlatformAiUserId(userId: string, platformAiUserId: string): boolean {
  return userId === platformAiUserId;
}
