'use client';

import { useEffect, useCallback, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Message } from '@/lib/types';

export interface PeerTypingState {
  isTyping: boolean;
  userId?: string;
  displayName?: string;
}

const PEER_TYPING_STALE_MS = 3000;

function mapIncomingMessage(detail: Message & {
  replyTo?: { id: string; content: string; firstName?: string; lastName?: string; senderFirstName?: string; senderLastName?: string };
}): Message {
  const createdAt =
    typeof detail.createdAt === 'string' && !Number.isNaN(Date.parse(detail.createdAt))
      ? detail.createdAt
      : new Date().toISOString();

  const replyTo = detail.replyTo
    ? {
        id: detail.replyTo.id,
        content: detail.replyTo.content,
        senderFirstName: detail.replyTo.senderFirstName ?? detail.replyTo.firstName ?? '',
        senderLastName: detail.replyTo.senderLastName ?? detail.replyTo.lastName ?? '',
      }
    : undefined;

  return {
    ...detail,
    createdAt,
    replyTo,
  };
}

export function useChatRealtime(conversationId: string | null) {
  const messages = useAppStore((s) => s.messages);
  const peerTypingSnap = useAppStore((s) => s.peerTyping);
  const currentUserId = useAppStore((s) => s.currentUser?.id);
  const [, tick] = useState(0);

  /** Only tick while peer typing is visible — avoids re-rendering ChatPanel every 400ms idle */
  useEffect(() => {
    if (!conversationId || !peerTypingSnap?.isTyping) return;
    if (peerTypingSnap.conversationId !== conversationId) return;
    if (peerTypingSnap.userId === currentUserId) return;

    const id = setInterval(() => tick((n) => n + 1), 400);
    return () => clearInterval(id);
  }, [
    conversationId,
    currentUserId,
    peerTypingSnap?.isTyping,
    peerTypingSnap?.conversationId,
    peerTypingSnap?.userId,
    peerTypingSnap?.updatedAt,
  ]);

  const peerTyping: PeerTypingState = useMemo(() => {
    if (!conversationId || !peerTypingSnap) return { isTyping: false };
    if (peerTypingSnap.conversationId !== conversationId) return { isTyping: false };
    if (peerTypingSnap.userId === currentUserId) return { isTyping: false };
    if (!peerTypingSnap.isTyping) return { isTyping: false };
    if (Date.now() - peerTypingSnap.updatedAt > PEER_TYPING_STALE_MS) {
      return { isTyping: false };
    }
    return {
      isTyping: true,
      userId: peerTypingSnap.userId,
      displayName: peerTypingSnap.displayName,
    };
  }, [conversationId, peerTypingSnap, currentUserId, tick]);

  const appendMessage = useCallback(
    (incoming: Message) => {
      const mapped = mapIncomingMessage(incoming);
      useAppStore.setState((state) => {
        if (mapped.clientTempId) {
          const withoutTemp = state.messages.filter(
            (m) => m.clientTempId !== mapped.clientTempId && m.id !== mapped.id
          );
          if (withoutTemp.some((m) => m.id === mapped.id)) return state;
          return { messages: [...withoutTemp, mapped] };
        }
        if (state.messages.some((m) => m.id === mapped.id)) return state;
        return { messages: [...state.messages, mapped] };
      });
    },
    []
  );

  const applyReadReceipt = useAppStore((s) => s.applyReadReceipt);

  const markReadByPeer = useCallback(
    (readerId: string) => {
      if (!conversationId) return;
      applyReadReceipt(conversationId, readerId);
    },
    [conversationId, applyReadReceipt]
  );

  useEffect(() => {
    if (!conversationId) return;

    const onNew = (e: Event) => {
      const detail = (e as CustomEvent<Message>).detail;
      if (detail.conversationId !== conversationId) return;
      appendMessage(detail);
    };

    const onRead = (e: Event) => {
      const detail = (e as CustomEvent<{ readerId: string; conversationId: string }>).detail;
      if (detail.conversationId !== conversationId) return;
      markReadByPeer(detail.readerId);
    };

    window.addEventListener('chat:new-message', onNew);
    window.addEventListener('chat:read-receipt', onRead);

    return () => {
      window.removeEventListener('chat:new-message', onNew);
      window.removeEventListener('chat:read-receipt', onRead);
    };
  }, [conversationId, appendMessage, markReadByPeer]);

  return { messages, peerTyping };
}
