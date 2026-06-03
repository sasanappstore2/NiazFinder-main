'use client';

import { useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

const POLL_MS = 400;

type TypingPollResponse = {
  isTyping: boolean;
  userId?: string;
  displayName?: string;
};

/**
 * Poll peer typing (works even when socket listeners miss events).
 */
export function useChatTypingPoll(conversationId: string | null, enabled: boolean) {
  const applyPeerTypingFromSocket = useAppStore((s) => s.applyPeerTypingFromSocket);
  const clearPeerTyping = useAppStore((s) => s.clearPeerTyping);
  const currentUserId = useAppStore((s) => s.currentUser?.id);

  useEffect(() => {
    if (!enabled || !conversationId || !currentUserId) return;

    const tick = async () => {
      try {
        const res = await apiFetch<TypingPollResponse>(
          `/api/chat/${conversationId}/typing`,
          { method: 'GET' }
        );
        if (!res.isTyping || !res.userId || res.userId === currentUserId) {
          clearPeerTyping(conversationId);
          return;
        }
        const parts = (res.displayName ?? '').trim().split(/\s+/);
        const firstName = parts[0] ?? '';
        const lastName = parts.slice(1).join(' ');
        applyPeerTypingFromSocket({
          conversationId,
          userId: res.userId,
          isTyping: true,
          user: { firstName, lastName },
        });
      } catch {
        /* ignore */
      }
    };

    void tick();
    const id = setInterval(() => void tick(), POLL_MS);
    return () => clearInterval(id);
  }, [
    conversationId,
    enabled,
    currentUserId,
    applyPeerTypingFromSocket,
    clearPeerTyping,
  ]);
}
