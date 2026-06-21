import type { Conversation } from '@/lib/types';

/** Map `/api/chat` conversation JSON into store shape. */
export function mapApiConversationItem(c: {
  id: string;
  requestId?: string | null;
  contactPointId?: string | null;
  businessProfileId?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | Date | null;
  unreadCount?: number;
  otherUser: Conversation['otherUser'];
  businessContext?: Conversation['businessContext'];
  isPlatformBot?: boolean;
}): Conversation {
  return {
    id: c.id,
    requestId: c.requestId ?? undefined,
    contactPointId: c.contactPointId ?? null,
    businessProfileId: c.businessProfileId ?? null,
    otherUser: c.otherUser,
    lastMessage: c.lastMessage ?? undefined,
    lastMessageAt: c.lastMessageAt ? String(c.lastMessageAt) : undefined,
    unreadCount: c.unreadCount ?? 0,
    businessContext: c.businessContext,
    isPlatformBot: Boolean(c.isPlatformBot),
  };
}
