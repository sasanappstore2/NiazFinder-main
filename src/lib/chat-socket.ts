'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/lib/store';
import type { Message } from '@/lib/types';

// ─── Socket Connection Manager ──────────────────────────────────────────

let socketInstance: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export interface ChatSocketAPI {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (conversationId: string, content: string, type?: string, clientTempId?: string, replyToId?: string) => boolean;
  emitTyping: (conversationId: string, isTyping: boolean) => void;
  markAsRead: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  reactToMessage: (messageId: string, emoji: string) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string, forEveryone: boolean) => void;
  pinMessage: (messageId: string, conversationId: string, unpin: boolean) => void;
  starMessage: (messageId: string, unstar: boolean) => void;
}

export function useChatSocket(): ChatSocketAPI {
  const {
    currentUser,
    isAuthenticated,
    conversations,
    setConversations,
    activeConversationId,
    addNotification,
  } = useAppStore();

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ─── Connect ────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!currentUser || !isAuthenticated) return;
    if (socketRef.current?.connected) return;

    const userId = currentUser.id;

    socketInstance = io('/?XTransformPort=3004', {
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('✅ Chat socket connected');
      reconnectAttempts = 0;

      // Join active conversation if any
      if (activeConversationId) {
        socketInstance!.emit('join:conversation', activeConversationId);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`❌ Chat socket disconnected: ${reason}`);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('⚠️ Chat socket connection error:', error.message);
      reconnectAttempts++;
    });

    // ─── Real-time Events ─────────────────────────────────────────────

    // New message received
    socketInstance.on('message:new', (data: {
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
      replyTo?: { id: string; content: string; senderFirstName: string; senderLastName: string };
    }) => {
      const now = new Date();
      const persianTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

      const message: Message & { replyToId?: string; replyTo?: { id: string; content: string; senderFirstName: string; senderLastName: string } } = {
        id: data.id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        type: data.type as Message['type'],
        isRead: data.isRead,
        createdAt: persianTime,
        clientTempId: data.clientTempId,
        replyToId: data.replyToId,
        replyTo: data.replyTo,
      };

      // Update conversation list
      setConversations(
        conversations.map(c =>
          c.id === data.conversationId
            ? { ...c, lastMessage: data.content, lastMessageAt: new Date().toISOString() }
            : c
        )
      );

      // Dispatch to active ChatPanel
      if (data.conversationId === activeConversationId) {
        window.dispatchEvent(new CustomEvent('chat:new-message', { detail: message }));
        socketInstance!.emit('message:read', { conversationId: data.conversationId });
      } else {
        const senderName = currentUser.id === data.senderId ? 'شما' : 'کاربر';
        addNotification({
          id: data.id,
          type: 'NEW_MESSAGE' as any,
          title: 'پیام جدید',
          message: data.content.slice(0, 80),
          isRead: false,
          createdAt: persianTime,
          data: { conversationId: data.conversationId },
        });
      }
    });

    // Typing indicator
    socketInstance.on('typing', (data: {
      conversationId: string;
      userId: string;
      user?: { id: string; firstName: string; lastName: string };
      isTyping: boolean;
    }) => {
      if (data.conversationId === activeConversationId) {
        window.dispatchEvent(new CustomEvent('chat:typing', { detail: data }));
      }
    });

    // Read receipt
    socketInstance.on('message:read-receipt', (data: {
      conversationId: string;
      readerId: string;
      count: number;
      timestamp: string;
    }) => {
      if (data.conversationId === activeConversationId) {
        window.dispatchEvent(new CustomEvent('chat:read-receipt', { detail: data }));
      }
    });

    // Conversation updated
    socketInstance.on('conversation:updated', (data: {
      id: string;
      lastMessage: string;
      lastMessageAt: string;
      otherUser: { id: string; firstName: string; lastName: string; avatar: string | null; online: boolean };
      unreadCount: number;
    }) => {
      setConversations(
        conversations.map(c =>
          c.id === data.id
            ? { ...c, lastMessage: data.lastMessage, lastMessageAt: data.lastMessageAt, unreadCount: data.unreadCount }
            : c
        )
      );
    });

    // User online/offline status
    socketInstance.on('user:status', (data: { userId: string; online: boolean; lastSeenAt: string }) => {
      setConversations(
        conversations.map(c =>
          c.otherUser?.id === data.userId
            ? { ...c, otherUser: { ...c.otherUser, online: data.online } }
            : c
        )
      );
      window.dispatchEvent(new CustomEvent('chat:user-status', { detail: data }));
    });

    // Conversation deleted
    socketInstance.on('conversation:deleted', (data: { conversationId: string; deletedBy: string }) => {
      if (data.conversationId === activeConversationId) {
        useAppStore.getState().setActiveConversationId(null);
      }
      setConversations(conversations.filter(c => c.id !== data.conversationId));
    });

    // Unread count update
    socketInstance.on('conversation:unread-update', (data: { conversationId: string; unreadCount: number; totalUnread?: number }) => {
      setConversations(
        conversations.map(c =>
          c.id === data.conversationId
            ? { ...c, unreadCount: data.unreadCount }
            : c
        )
      );
    });

    // ─── New Real-time Events (Enterprise) ─────────────────────────────

    // Message reaction added
    socketInstance.on('message:reaction-added', (data: any) => {
      window.dispatchEvent(new CustomEvent('chat:reaction-added', { detail: data }));
    });

    // Message reaction updated
    socketInstance.on('message:reaction-updated', (data: any) => {
      window.dispatchEvent(new CustomEvent('chat:reaction-updated', { detail: data }));
    });

    // Message reaction removed
    socketInstance.on('message:reaction-removed', (data: any) => {
      window.dispatchEvent(new CustomEvent('chat:reaction-removed', { detail: data }));
    });

    // Message edited
    socketInstance.on('message:edited', (data: any) => {
      window.dispatchEvent(new CustomEvent('chat:message-edited', { detail: data }));
    });

    // Message deleted
    socketInstance.on('message:deleted', (data: any) => {
      window.dispatchEvent(new CustomEvent('chat:message-deleted', { detail: data }));
    });

    // Message pinned/unpinned
    socketInstance.on('message:pin-changed', (data: any) => {
      window.dispatchEvent(new CustomEvent('chat:message-pin-changed', { detail: data }));
    });

    // Message starred/unstarred
    socketInstance.on('message:star-changed', (data: any) => {
      window.dispatchEvent(new CustomEvent('chat:message-star-changed', { detail: data }));
    });
  }, [currentUser, isAuthenticated, activeConversationId, conversations, setConversations, addNotification]);

  // ─── Disconnect ────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      socketInstance = null;
    }
  }, []);

  // ─── Send Message ──────────────────────────────────────────────────
  const sendMessage = useCallback(
    (conversationId: string, content: string, type: string = 'TEXT', clientTempId?: string, replyToId?: string) => {
      if (!socketRef.current?.connected) return false;
      socketRef.current.emit('message:send', {
        conversationId,
        content,
        type,
        clientTempId,
        replyToId,
      });
      return true;
    },
    []
  );

  // ─── Emit Typing ──────────────────────────────────────────────────
  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!socketRef.current?.connected) return;

    const existing = typingTimeoutRef.current.get(conversationId);
    if (existing) clearTimeout(existing);

    socketRef.current.emit('typing', { conversationId, isTyping });

    if (isTyping) {
      typingTimeoutRef.current.set(conversationId, setTimeout(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('typing', { conversationId, isTyping: false });
        }
        typingTimeoutRef.current.delete(conversationId);
      }, 3000));
    }
  }, []);

  // ─── Mark as Read ─────────────────────────────────────────────────
  const markAsRead = useCallback((conversationId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message:read', { conversationId });
  }, []);

  // ─── Delete Conversation ──────────────────────────────────────────
  const deleteConversation = useCallback((conversationId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('conversation:delete', conversationId);
  }, []);

  // ─── React to Message ─────────────────────────────────────────────
  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message:react', { messageId, emoji });
  }, []);

  // ─── Edit Message ─────────────────────────────────────────────────
  const editMessage = useCallback((messageId: string, content: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message:edit', { messageId, content });
  }, []);

  // ─── Delete Message ───────────────────────────────────────────────
  const deleteMessage = useCallback((messageId: string, forEveryone: boolean) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message:delete', { messageId, forEveryone });
  }, []);

  // ─── Pin Message ──────────────────────────────────────────────────
  const pinMessage = useCallback((messageId: string, conversationId: string, unpin: boolean) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message:pin', { messageId, conversationId, unpin });
  }, []);

  // ─── Star Message ─────────────────────────────────────────────────
  const starMessage = useCallback((messageId: string, unstar: boolean) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message:star', { messageId, unstar });
  }, []);

  // ─── Lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      connect();
    }

    return () => {
      disconnect();
      for (const timeout of typingTimeoutRef.current.values()) {
        clearTimeout(timeout);
      }
      typingTimeoutRef.current.clear();
    };
  }, [isAuthenticated, currentUser, connect, disconnect]);

  // Re-join conversation when active changes
  useEffect(() => {
    if (socketRef.current?.connected && activeConversationId) {
      socketRef.current.emit('join:conversation', activeConversationId);
    }
  }, [activeConversationId]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
    sendMessage,
    emitTyping,
    markAsRead,
    deleteConversation,
    reactToMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    starMessage,
  };
}
