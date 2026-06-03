'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/lib/store';
import { getChatSocketConfig } from '@/lib/chat-socket-config';
import {
  registerChatSocketBridge,
  unregisterChatSocketBridge,
  setChatSocketConnected,
} from '@/lib/chat/socket-bridge';
import { bindChatSocketListeners } from '@/lib/chat/chat-socket-listeners';

let socketInstance: Socket | null = null;
let reconnectAttempts = 0;
let lastConnectErrorLogAt = 0;
let socketConsumerCount = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const CONNECT_ERROR_LOG_INTERVAL_MS = 20_000;

export interface ChatSocketAPI {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (
    conversationId: string,
    content: string,
    type?: string,
    clientTempId?: string,
    replyToId?: string,
    replyTo?: {
      id: string;
      content: string;
      senderFirstName: string;
      senderLastName: string;
    }
  ) => boolean;
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
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const currentUser = useAppStore((s) => s.currentUser);
  const authToken = useAppStore((s) => s.authToken);
  const activeConversationId = useAppStore((s) => s.activeConversationId);

  const socketRef = useRef<Socket | null>(null);
  const listenersBoundRef = useRef(false);
  const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const connect = useCallback(() => {
    if (!currentUser || !isAuthenticated || !authToken) return;

    const { url, path, enabled, useNestNamespace } = getChatSocketConfig();
    if (!enabled || !url) return;

    if (socketRef.current?.connected) {
      const activeId = useAppStore.getState().activeConversationId;
      if (activeId) {
        socketRef.current.emit('join:conversation', activeId);
      }
      return;
    }

    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      setIsConnected(true);
      setChatSocketConnected(true);
      setSocket(socketInstance);
      (window as unknown as { __chatSocket?: Socket }).__chatSocket = socketInstance;
      const activeId = useAppStore.getState().activeConversationId;
      if (activeId) {
        socketInstance.emit('join:conversation', activeId);
      }
      return;
    }

    if (socketRef.current || socketInstance) {
      const existing = socketRef.current ?? socketInstance!;
      existing.auth = { token: authToken };
      socketRef.current = existing;
      socketInstance = existing;
      existing.connect();
      return;
    }

    const namespaceUrl =
      useNestNamespace && !url.endsWith('/chat') ? `${url}/chat` : url.replace(/\/chat$/, '');

    socketInstance = io(namespaceUrl, {
      path,
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20_000,
    });

    socketRef.current = socketInstance;

    if (!listenersBoundRef.current) {
      bindChatSocketListeners(socketInstance);
      listenersBoundRef.current = true;
    }

    socketInstance.on('connect', () => {
      console.log('✅ Chat socket connected');
      reconnectAttempts = 0;
      setIsConnected(true);
      setChatSocketConnected(true);
      setSocket(socketInstance);

      (window as unknown as { __chatSocket?: Socket }).__chatSocket = socketInstance!;

      const activeId = useAppStore.getState().activeConversationId;
      if (activeId) {
        socketInstance!.emit('join:conversation', activeId);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`❌ Chat socket disconnected: ${reason}`);
      setIsConnected(false);
      setChatSocketConnected(false);
      setSocket(null);
    });

    socketInstance.on('connect_error', (error) => {
      reconnectAttempts++;
      const now = Date.now();
      if (now - lastConnectErrorLogAt < CONNECT_ERROR_LOG_INTERVAL_MS) return;
      lastConnectErrorLogAt = now;

      if (error.message === 'timeout') {
        console.warn(
          '[chat] اتصال به Communication Gateway برقرار نشد. npm run dev:chat را اجرا کنید (پورت 3004)'
        );
      } else {
        console.warn('[chat] خطای اتصال:', error.message);
      }
    });
  }, [currentUser, isAuthenticated, authToken]);

  const disconnect = useCallback(() => {
    socketConsumerCount = Math.max(0, socketConsumerCount - 1);
    if (socketConsumerCount > 0) return;

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      socketInstance = null;
      listenersBoundRef.current = false;
      delete (window as unknown as { __chatSocket?: Socket }).__chatSocket;
    }
    setIsConnected(false);
    setChatSocketConnected(false);
    setSocket(null);
  }, []);

  const previewMessage = useCallback(
    (
      conversationId: string,
      content: string,
      clientTempId: string,
      type: string = 'TEXT'
    ) => {
      if (!socketRef.current?.connected) return false;
      socketRef.current.emit('message:preview', {
        conversationId,
        content,
        type,
        clientTempId,
      });
      return true;
    },
    []
  );

  const sendMessage = useCallback(
    (
      conversationId: string,
      content: string,
      type: string = 'TEXT',
      clientTempId?: string,
      replyToId?: string,
      replyTo?: {
        id: string;
        content: string;
        senderFirstName: string;
        senderLastName: string;
      }
    ) => {
      if (!socketRef.current?.connected) return false;
      socketRef.current.emit('message:send', {
        conversationId,
        content,
        type,
        clientTempId,
        replyToId,
        replyTo,
      });
      return true;
    },
    []
  );

  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!socketRef.current?.connected) return;

    const existing = typingTimeoutRef.current.get(conversationId);
    if (existing) clearTimeout(existing);

    socketRef.current.emit('typing', { conversationId, isTyping });

    if (isTyping) {
      typingTimeoutRef.current.set(
        conversationId,
        setTimeout(() => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('typing', { conversationId, isTyping: false });
          }
          typingTimeoutRef.current.delete(conversationId);
        }, 3000)
      );
    }
  }, []);

  const markAsRead = useCallback((conversationId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message:read', { conversationId });
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('conversation:delete', conversationId);
  }, []);

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    if (!socketRef.current?.connected) return false;
    socketRef.current.emit('message:react', { messageId, emoji });
    return true;
  }, []);

  const editMessage = useCallback((messageId: string, content: string) => {
    if (!socketRef.current?.connected) return false;
    socketRef.current.emit('message:edit', { messageId, content });
    return true;
  }, []);

  const deleteMessage = useCallback((messageId: string, forEveryone: boolean) => {
    if (!socketRef.current?.connected) return false;
    socketRef.current.emit('message:delete', { messageId, forEveryone });
    return true;
  }, []);

  const pinMessage = useCallback(
    (messageId: string, conversationId: string, unpin: boolean) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit('message:pin', { messageId, conversationId, unpin });
    },
    []
  );

  const starMessage = useCallback((messageId: string, unstar: boolean) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message:star', { messageId, unstar });
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser && authToken) {
      socketConsumerCount += 1;
      connect();
    }
    return () => {
      disconnect();
    };
  }, [isAuthenticated, currentUser, authToken, connect, disconnect]);

  useEffect(() => {
    return () => {
      for (const timeout of typingTimeoutRef.current.values()) {
        clearTimeout(timeout);
      }
      typingTimeoutRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (socketRef.current?.connected && activeConversationId) {
      socketRef.current.emit('join:conversation', activeConversationId);
      socketRef.current.emit('message:read', { conversationId: activeConversationId });
    }
  }, [activeConversationId, isConnected]);

  useEffect(() => {
    if (socketRef.current && authToken) {
      socketRef.current.auth = { token: authToken };
    }
  }, [authToken]);

  const joinConversation = useCallback((conversationId: string) => {
    if (!socketRef.current?.connected || !conversationId) return;
    socketRef.current.emit('join:conversation', conversationId);
  }, []);

  useEffect(() => {
    registerChatSocketBridge({
      sendMessage,
      previewMessage,
      emitTyping,
      joinConversation,
      isConnected: () => Boolean(socketRef.current?.connected),
      reactToMessage,
      deleteMessage,
      editMessage,
    });
    return () => unregisterChatSocketBridge();
  }, [sendMessage, emitTyping, joinConversation, isConnected, reactToMessage, deleteMessage, editMessage]);

  return {
    socket,
    isConnected,
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
