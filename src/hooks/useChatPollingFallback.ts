'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { isChatSocketConnected } from '@/lib/chat/socket-bridge';

const POLL_MS = 10_000;

/** Refetch messages/conversations when realtime socket is down. */
export function useChatPollingFallback(activeConversationId: string | null) {
  const fetchConversationMessages = useAppStore((s) => s.fetchConversationMessages);
  const fetchConversations = useAppStore((s) => s.fetchConversations);

  useEffect(() => {
    if (!activeConversationId) return;

    const refetch = () => {
      if (isChatSocketConnected()) return;
      void fetchConversationMessages(activeConversationId);
      void fetchConversations();
    };

    refetch();
    const interval = setInterval(refetch, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeConversationId, fetchConversationMessages, fetchConversations]);
}
