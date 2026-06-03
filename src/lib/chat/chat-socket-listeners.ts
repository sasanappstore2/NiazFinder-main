import type { Socket } from 'socket.io-client';
import { useAppStore } from '@/lib/store';
import {
  appendIncomingMessageToStore,
  mapIncomingSocketMessage,
  previewFromIncoming,
  type IncomingMessagePayload,
} from '@/lib/chat/append-incoming-message';

function handleMessageNew(socket: Socket, data: IncomingMessagePayload) {
  const state = useAppStore.getState();
  const activeId = state.activeConversationId;
  const me = state.currentUser?.id;
  const message = mapIncomingSocketMessage(data);
  const preview = previewFromIncoming(data);
  const sentAt = data.createdAt || new Date().toISOString();
  const isIncoming = me && data.senderId !== me;

  useAppStore.setState((s) => {
    const typingActivityByConvId = { ...s.typingActivityByConvId };
    delete typingActivityByConvId[data.conversationId];
    return {
      conversations: s.conversations.map((c) =>
        c.id === data.conversationId
          ? {
              ...c,
              lastMessage: preview,
              lastMessageAt: sentAt,
              isPeerTyping: false,
              unreadCount:
                isIncoming && data.conversationId !== activeId
                  ? (c.unreadCount ?? 0) + 1
                  : c.unreadCount,
            }
          : c
      ),
      messages: appendIncomingMessageToStore(s.messages, message),
      typingActivityByConvId,
    };
  });

  if (data.conversationId !== activeId) {
    if (state.currentUser?.id !== data.senderId) {
      const persianTime = new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      state.addNotification({
        id: data.id,
        type: 'NEW_MESSAGE',
        title: 'پیام جدید',
        message: data.content.slice(0, 80),
        isRead: false,
        createdAt: persianTime,
        data: { conversationId: data.conversationId },
      });
    }
    return;
  }

  window.dispatchEvent(new CustomEvent('chat:new-message', { detail: message }));

  if (socket.connected) {
    socket.emit('message:read', { conversationId: data.conversationId });
  }
}

export function bindChatSocketListeners(socket: Socket): void {
  socket.off('message:new');
  socket.on('message:new', (data: IncomingMessagePayload) => handleMessageNew(socket, data));

  socket.off('typing');
  socket.on('typing', (data: {
    conversationId: string;
    userId: string;
    user?: { id: string; firstName: string; lastName: string };
    isTyping: boolean;
  }) => {
    useAppStore.getState().applyPeerTypingFromSocket({
      conversationId: data.conversationId,
      userId: data.userId,
      isTyping: data.isTyping,
      user: data.user,
    });
    window.dispatchEvent(new CustomEvent('chat:typing', { detail: data }));
  });

  socket.off('message:read-receipt');
  socket.on('message:read-receipt', (data: {
    conversationId: string;
    readerId: string;
    count: number;
    timestamp: string;
  }) => {
    useAppStore.getState().applyReadReceipt(data.conversationId, data.readerId);
    window.dispatchEvent(new CustomEvent('chat:read-receipt', { detail: data }));
  });

  socket.off('conversation:updated');
  socket.on('conversation:updated', (data: {
    id: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
  }) => {
    useAppStore.setState((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === data.id
          ? {
              ...c,
              lastMessage: data.lastMessage,
              lastMessageAt: data.lastMessageAt,
              unreadCount: data.unreadCount,
              isPeerTyping: c.isPeerTyping,
            }
          : c
      ),
    }));
  });

  socket.off('user:status');
  socket.on('user:status', (data: { userId: string; online: boolean; lastSeenAt: string }) => {
    useAppStore.setState((s) => ({
      conversations: s.conversations.map((c) =>
        c.otherUser?.id === data.userId
          ? { ...c, otherUser: { ...c.otherUser, online: data.online } }
          : c
      ),
    }));
    window.dispatchEvent(new CustomEvent('chat:user-status', { detail: data }));
  });

  socket.off('conversation:deleted');
  socket.on('conversation:deleted', (data: { conversationId: string }) => {
    const activeId = useAppStore.getState().activeConversationId;
    if (data.conversationId === activeId) {
      useAppStore.getState().setActiveConversationId(null);
    }
    useAppStore.setState((s) => ({
      conversations: s.conversations.filter((c) => c.id !== data.conversationId),
    }));
  });

  socket.off('conversation:unread-update');
  socket.on('conversation:unread-update', (data: {
    conversationId: string;
    unreadCount: number;
  }) => {
    useAppStore.setState((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === data.conversationId ? { ...c, unreadCount: data.unreadCount } : c
      ),
    }));
  });

  type ReactionSocketPayload = {
    messageId: string;
    conversationId: string;
    userId: string;
    emoji: string;
    user?: { id: string; firstName: string; lastName: string; avatar?: string };
  };

  const handleReaction = (
    eventType: 'added' | 'updated' | 'removed',
    data: ReactionSocketPayload
  ) => {
    useAppStore.getState().applyMessageReaction({
      messageId: data.messageId,
      conversationId: data.conversationId,
      userId: data.userId,
      emoji: data.emoji,
      eventType,
      user: data.user,
    });
    window.dispatchEvent(
      new CustomEvent(`chat:reaction-${eventType}`, { detail: data })
    );
  };

  socket.off('message:reaction-added');
  socket.on('message:reaction-added', (data: ReactionSocketPayload) =>
    handleReaction('added', data)
  );
  socket.off('message:reaction-updated');
  socket.on('message:reaction-updated', (data: ReactionSocketPayload) =>
    handleReaction('updated', data)
  );
  socket.off('message:reaction-removed');
  socket.on('message:reaction-removed', (data: ReactionSocketPayload) =>
    handleReaction('removed', data)
  );

  socket.off('message:edited');
  socket.on('message:edited', (data: {
    messageId: string;
    conversationId: string;
    content: string;
    editedAt?: string;
  }) => {
    useAppStore.getState().applyMessageEdited(data);
    window.dispatchEvent(new CustomEvent('chat:message-edited', { detail: data }));
  });

  socket.off('message:deleted');
  socket.on(
    'message:deleted',
    (data: {
      messageId: string;
      conversationId: string;
      forEveryone: boolean;
      userId?: string;
    }) => {
      useAppStore.getState().applyMessageDeleted(data);
      window.dispatchEvent(new CustomEvent('chat:message-deleted', { detail: data }));
    }
  );
  const relay = (eventName: string) => (data: unknown) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  };

  socket.off('message:pin-changed');
  socket.on('message:pin-changed', relay('chat:message-pin-changed'));
  socket.off('message:star-changed');
  socket.on('message:star-changed', relay('chat:message-star-changed'));

  socket.off('call:invite');
  socket.on('call:invite', (data: {
    callId: string;
    callerId: string;
    sdpOffer?: RTCSessionDescriptionInit;
    from?: {
      id: string;
      firstName: string;
      lastName: string;
      displayName?: string;
      avatar?: string;
    };
  }) => {
    window.dispatchEvent(
      new CustomEvent('call:invite', {
        detail: {
          callId: data.callId,
          from: {
            id: data.from?.id ?? data.callerId,
            firstName: data.from?.firstName ?? '',
            lastName: data.from?.lastName ?? '',
            displayName: data.from?.displayName,
            avatar: data.from?.avatar,
            email: '',
            role: 'CLIENT' as const,
            isVerified: false,
            isActive: true,
            online: true,
          },
          sdpOffer: data.sdpOffer,
        },
      })
    );
  });

  socket.off('call:ringing');
  socket.on('call:ringing', (data: {
    callId: string;
    callerId: string;
    from?: {
      id: string;
      firstName: string;
      lastName: string;
      displayName?: string;
      avatar?: string;
    };
  }) => {
    window.dispatchEvent(
      new CustomEvent('call:ringing', {
        detail: {
          callId: data.callId,
          from: {
            id: data.from?.id ?? data.callerId,
            firstName: data.from?.firstName ?? '',
            lastName: data.from?.lastName ?? '',
            displayName: data.from?.displayName,
            avatar: data.from?.avatar,
            email: '',
            role: 'CLIENT' as const,
            isVerified: false,
            isActive: true,
            online: true,
          },
        },
      })
    );
  });

  socket.off('call:accept');
  socket.on('call:accept', (data) => {
    window.dispatchEvent(new CustomEvent('call:accept', { detail: data }));
  });
  socket.off('call:accepted');
  socket.on('call:accepted', (data: { callId: string; sdpAnswer?: RTCSessionDescriptionInit }) => {
    window.dispatchEvent(new CustomEvent('call:accepted', { detail: data }));
  });
  socket.off('call:ice-candidate');
  socket.on('call:ice-candidate', (data) => {
    window.dispatchEvent(new CustomEvent('call:ice-candidate', { detail: data }));
  });
  socket.off('call:reject');
  socket.on('call:reject', (data) => {
    window.dispatchEvent(new CustomEvent('call:reject', { detail: data }));
  });
  socket.off('call:unavailable');
  socket.on('call:unavailable', (data) => {
    window.dispatchEvent(new CustomEvent('call:unavailable', { detail: data }));
  });
  socket.off('call:hangup');
  socket.on('call:hangup', (data) => {
    window.dispatchEvent(new CustomEvent('call:hangup', { detail: data }));
  });
}
