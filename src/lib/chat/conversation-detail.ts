import { db } from '@/lib/db';
import { fetchLivePresence } from '@/lib/chat/live-presence';
import { resolveUserOnline } from '@/lib/chat/resolve-online';
import { isPlatformAiUserId } from '@/lib/platform-ai/conversation';
import { getPlatformAiUserId } from '@/lib/platform-ai/user';
import { sanitizeMessageContentForClient } from '@/lib/persian-encoding-guard';

export type ConversationDetailDto = {
  id: string;
  requestId: string | null;
  contactPointId: string | null;
  businessProfileId: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    online: boolean;
    lastSeenAt: string | null;
  };
  businessContext?: {
    businessName: string;
    contactLabel: string;
    logo: string | null;
  };
  isPlatformBot?: boolean;
};

/** Load a single conversation for the authenticated participant. */
export async function getConversationDetailForUser(
  conversationId: string,
  userId: string
): Promise<ConversationDetailDto | null> {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      user1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          online: true,
          lastSeenAt: true,
        },
      },
      user2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          online: true,
          lastSeenAt: true,
        },
      },
      contactPoint: {
        include: { profile: { select: { name: true, logo: true } } },
      },
      messages: {
        where: { senderId: { not: userId }, isRead: false },
        select: { id: true },
      },
    },
  });

  if (!conv) return null;
  if (conv.userId1 !== userId && conv.userId2 !== userId) return null;

  const platformAiUserId = await getPlatformAiUserId();
  const isUser1 = conv.userId1 === userId;
  const otherUser = isUser1 ? conv.user2 : conv.user1;
  const livePresence = await fetchLivePresence([otherUser.id]);
  const isPlatformBot = isPlatformAiUserId(otherUser.id, platformAiUserId);

  return {
    id: conv.id,
    requestId: conv.requestId,
    contactPointId: conv.contactPointId,
    businessProfileId: conv.businessProfileId,
    lastMessage: conv.lastMessage
      ? sanitizeMessageContentForClient(conv.lastMessage, 'TEXT')
      : conv.lastMessage,
    lastMessageAt: conv.lastMessageAt,
    unreadCount: conv.messages.length,
    otherUser: {
      id: otherUser.id,
      firstName: otherUser.firstName,
      lastName: otherUser.lastName,
      avatar: otherUser.avatar,
      online: isPlatformBot
        ? true
        : resolveUserOnline(otherUser.id, livePresence, {
            online: otherUser.online,
            lastSeenAt: otherUser.lastSeenAt?.toISOString() ?? null,
          }),
      lastSeenAt: otherUser.lastSeenAt?.toISOString() ?? null,
    },
    businessContext: conv.contactPoint
      ? {
          businessName: conv.contactPoint.profile.name,
          contactLabel: conv.contactPoint.label,
          logo: conv.contactPoint.profile.logo,
        }
      : undefined,
    isPlatformBot,
  };
}
