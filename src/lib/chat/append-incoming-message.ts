import type { Message, MessageReactionItem } from '@/lib/types';
import { MESSAGE_DELETED_TOMBSTONE } from '@/lib/chat/message-delete';
import { chatMessageListPreview } from '@/lib/chat/contact-share';
import {
  agentReplyClientId,
  agentStreamIdForTurn,
  bumpAgentStreamAfterUser,
  compareMessages,
  sortMessagesChronologically,
} from '@/lib/chat/message-order';

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
  if (incoming.clientTempId?.startsWith('agent-reply:')) {
    const turnId = incoming.clientTempId.slice('agent-reply:'.length);
    const streamId = agentStreamIdForTurn(turnId);
    const streamIdx = messages.findIndex((m) => m.id === streamId);
    if (streamIdx >= 0) {
      const next = messages.filter((m) => m.id !== incoming.id);
      next[streamIdx] = {
        ...incoming,
        agentStreaming: false,
        agentStatus: 'done',
      };
      return next;
    }
  }

  if (incoming.clientTempId) {
    const tempIndex = messages.findIndex((m) => m.clientTempId === incoming.clientTempId);
    const temp = tempIndex >= 0 ? messages[tempIndex] : undefined;
    const merged: Message =
      temp?.replyTo && !incoming.replyTo
        ? { ...incoming, replyTo: temp.replyTo }
        : incoming;

    if (tempIndex >= 0) {
      const next = messages.filter(
        (m) => m.id !== incoming.id || m.clientTempId === incoming.clientTempId,
      );
      const idx = next.findIndex((m) => m.clientTempId === incoming.clientTempId);
      if (idx >= 0) {
        next[idx] = merged;
        return bumpAgentStreamAfterUser(next, incoming.clientTempId, merged.createdAt);
      }
    }

    const withoutDup = messages.filter(
      (m) => m.clientTempId !== incoming.clientTempId && m.id !== incoming.id,
    );
    if (withoutDup.some((m) => m.id === incoming.id)) return withoutDup;
    return sortMessagesChronologically([...withoutDup, merged]);
  }

  if (messages.some((m) => m.id === incoming.id)) return messages;
  return sortMessagesChronologically([...messages, incoming]);
}

export function previewFromIncoming(data: IncomingMessagePayload): string {
  return chatMessageListPreview(data.content, data.type);
}

export { compareMessages, sortMessagesChronologically } from '@/lib/chat/message-order';
