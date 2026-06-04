import type { Message, MessageReactionItem } from '@/lib/types';
import { isHiddenForUser, MESSAGE_DELETED_TOMBSTONE } from '@/lib/chat/message-delete';

type DbReaction = {
  emoji: string;
  userId: string;
  user?: { id: string; firstName: string; lastName: string; avatar: string | null };
};

type DbReply = {
  id: string;
  content: string;
  type: string;
  deletedAt: Date | null;
  sender: { firstName: string; lastName: string };
};

export type DbMessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  attachmentUrls: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  clientTempId: string | null;
  replyToId: string | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  deletedFor?: string | null;
  isPinned?: boolean;
  pinnedBy?: string | null;
  pinnedAt?: Date | null;
  replyTo?: DbReply | null;
  reactions?: DbReaction[];
};

export function replyPreview(content: string, type: string, max = 120): string {
  if (type === 'CALL') return 'تماس صوتی';
  if (type === 'VOICE') return 'پیام صوتی';
  if (type === 'IMAGE') return 'عکس';
  if (type === 'FILE') return 'فایل';
  return content.length > max ? `${content.slice(0, max)}…` : content;
}

export function mapDbMessageToClient(
  m: DbMessageRow,
  conversationId: string,
  viewerId: string
): Message | null {
  if (m.deletedFor && isHiddenForUser(m.deletedFor, viewerId)) {
    return null;
  }

  const reactions: MessageReactionItem[] | undefined = m.reactions?.length
    ? m.reactions.map((r) => ({
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
      }))
    : undefined;

  let replyTo: Message['replyTo'];
  if (m.replyTo && !m.replyTo.deletedAt) {
    replyTo = {
      id: m.replyTo.id,
      content: replyPreview(m.replyTo.content, m.replyTo.type),
      senderFirstName: m.replyTo.sender.firstName,
      senderLastName: m.replyTo.sender.lastName,
    };
  }

  const deletedEveryone = Boolean(m.deletedAt);

  return {
    id: m.id,
    conversationId,
    senderId: m.senderId,
    content: deletedEveryone ? MESSAGE_DELETED_TOMBSTONE : m.content,
    type: m.type as Message['type'],
    attachmentUrls: JSON.parse(m.attachmentUrls || '[]') as string[],
    isRead: m.isRead,
    createdAt: m.createdAt.toISOString(),
    clientTempId: m.clientTempId ?? undefined,
    replyToId: m.replyToId ?? undefined,
    replyTo: deletedEveryone ? undefined : replyTo,
    reactions: deletedEveryone ? undefined : reactions,
    deletedAt: m.deletedAt?.toISOString() ?? null,
    editedAt: m.editedAt?.toISOString() ?? null,
    isPinned: m.isPinned ?? false,
    pinnedBy: m.pinnedBy ?? undefined,
    pinnedAt: m.pinnedAt?.toISOString() ?? undefined,
  };
}
