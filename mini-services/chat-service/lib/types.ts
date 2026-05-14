import type { Socket } from 'socket.io';

// ─── Types ───────────────────────────────────────────────────────────────

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      avatar?: string | null;
    };
  };
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE';
  attachmentUrls?: string[];
  clientTempId?: string;
  replyToId?: string;
}

export interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

export interface MarkReadPayload {
  conversationId: string;
  messageIds?: string[];
}

export interface ReplyInfo {
  id: string;
  senderId: string;
  content: string;
  firstName: string;
  lastName: string;
}

export interface MessageBroadcast {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  attachmentUrls: string[];
  isRead: boolean;
  createdAt: string;
  clientTempId?: string;
  replyToId?: string;
  replyTo?: ReplyInfo;
}

export interface UserStatus {
  userId: string;
  online: boolean;
  lastSeenAt: string;
}

// ─── Reaction Events ────────────────────────────────────────────────────

export interface ReactionPayload {
  messageId: string;
  emoji: string;
}

export interface ReactionData {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  user: { id: string; firstName: string; lastName: string; avatar?: string | null };
  createdAt: string;
}

// ─── Message Edit ───────────────────────────────────────────────────────

export interface MessageEditPayload {
  messageId: string;
  content: string;
}

// ─── Message Delete ─────────────────────────────────────────────────────

export interface MessageDeletePayload {
  messageId: string;
  forEveryone: boolean;
}

// ─── Message Pin ────────────────────────────────────────────────────────

export interface MessagePinPayload {
  messageId: string;
  conversationId: string;
  unpin: boolean;
}

// ─── Message Star ───────────────────────────────────────────────────────

export interface MessageStarPayload {
  messageId: string;
  unstar: boolean;
}
