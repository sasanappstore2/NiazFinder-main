'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { isChatSocketConnected } from '@/lib/chat/socket-bridge';

const POLL_MS = 10_000;
// Refresh the (heavier) conversation list every Nth message poll — the open
// thread is what the user is watching, so it gets every tick.
const CONVERSATIONS_EVERY = 3;

/** Refetch messages/conversations ONLY while the realtime socket is down. */
export function useChatPollingFallback(activeConversationId: string | null) {
  const fetchConversationMessages = useAppStore((s) => s.fetchConversationMessages);
  const fetchConversations = useAppStore((s) => s.fetchConversations);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!activeConversationId) return;
    tickRef.current = 0;

    // `full` forces a conversation-list sync (used on mount + tab refocus);
    // periodic ticks only sync the list every CONVERSATIONS_EVERY polls.
    const refetch = (full = false) => {
      if (isChatSocketConnected()) return;
      void fetchConversationMessages(activeConversationId);
      const tick = (tickRef.current = tickRef.current + 1);
      if (full || tick % CONVERSATIONS_EVERY === 1) {
        void fetchConversations();
      }
    };

    refetch(true);
    const interval = setInterval(() => refetch(false), POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch(true);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeConversationId, fetchConversationMessages, fetchConversations]);
}
