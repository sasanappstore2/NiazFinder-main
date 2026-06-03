'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { isChatSocketConnected } from '@/lib/chat/socket-bridge';

const POLL_FAST_MS = 2000;
const POLL_SLOW_MS = 12000;

/**
 * Keeps conversation list fresh when user is on messages view but not inside a thread.
 */
export function useConversationsPoll(enabled: boolean) {
  const fetchConversations = useAppStore((s) => s.fetchConversations);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => void fetchConversations();

    tick();
    const interval = isChatSocketConnected() ? POLL_SLOW_MS : POLL_FAST_MS;
    const id = setInterval(tick, interval);

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, fetchConversations]);
}
