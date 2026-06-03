import type { Message, MessageReactionItem } from '@/lib/types';
import { MESSAGE_DELETED_TOMBSTONE } from '@/lib/chat/message-delete';
import { chatMessageListPreview } from '@/lib/chat/contact-share';

export type IncomingMessagePayload = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  attachmentUrls?: string[];
  isRead: boolean;
  createdAt: string;
  clientTempId?: string;
  replyToId?: string;
  replyTo?: {
    id: string;
    content: string;
    senderFirstName?: string;
    senderLastName?: string;
    firstName?: string;
    lastName?: string;
  };
  reactions?: MessageReactionItem[];
  deletedAt?: string | null;
};

export function mapIncomingSocketMessage(data: IncomingMessagePayload): Message {
  const deletedEveryone = Boolean(data.deletedAt);
  return {
    id: data.id,
    conversationId: data.conversationId,
    senderId: data.senderId,
    content: deletedEveryone ? MESSAGE_DELETED_TOMBSTONE : data.content,
    type: data.type as Message['type'],
    attachmentUrls: data.attachmentUrls ?? [],
    isRead: data.isRead,
    createdAt: data.createdAt,
    clientTempId: data.clientTempId,
    replyToId: data.replyToId,
    replyTo:
      !deletedEveryone && data.replyTo
        ? {
            id: data.replyTo.id,
            content: data.replyTo.content,
            senderFirstName:
              data.replyTo.senderFirstName ?? data.replyTo.firstName ?? '',
            senderLastName:
              data.replyTo.senderLastName ?? data.replyTo.lastName ?? '',
          }
        : undefined,
    reactions: deletedEveryone ? undefined : data.reactions,
    deletedAt: data.deletedAt ?? null,
  };
}

/** Merge incoming message into zustand store (idempotent). */
export function appendIncomingMessageToStore(
  messages: Message[],
  incoming: Message
): Message[] {
  if (incoming.clientTempId) {
    const temp = messages.find((m) => m.clientTempId === incoming.clientTempId);
    const merged =
      temp?.replyTo && !incoming.replyTo ? { ...incoming, replyTo: temp.replyTo } : incoming;
    const withoutTemp = messages.filter(
      (m) => m.clientTempId !== incoming.clientTempId && m.id !== incoming.id
    );
    if (withoutTemp.some((m) => m.id === incoming.id)) return withoutTemp;
    return [...withoutTemp, merged];
  }
  if (messages.some((m) => m.id === incoming.id)) return messages;
  const merged = [...messages, incoming];
  return merged.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function previewFromIncoming(data: IncomingMessagePayload): string {
  return chatMessageListPreview(data.content, data.type);
}
