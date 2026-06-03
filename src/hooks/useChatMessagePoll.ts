'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { isChatSocketConnected } from '@/lib/chat/socket-bridge';

const POLL_SOCKET_DOWN_MS = 1500;
/** Backup when socket claims connected but events were missed */
const POLL_SOCKET_UP_MS = 4000;

/**
 * Poll active thread messages — always runs a light backup; faster when socket is down.
 */
export function useChatMessagePoll(
  conversationId: string | null,
  enabled: boolean
) {
  const fetchConversationMessages = useAppStore((s) => s.fetchConversationMessages);
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (!enabled || !conversationId) return;

    const tick = () => {
      void fetchConversationMessages(conversationId);
    };

    tick();
    const interval = isChatSocketConnected() ? POLL_SOCKET_UP_MS : POLL_SOCKET_DOWN_MS;
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [conversationId, enabled, fetchConversationMessages]);

  useEffect(() => {
    lastCountRef.current = 0;
  }, [conversationId]);
}
