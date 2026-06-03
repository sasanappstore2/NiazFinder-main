'use client';

import { useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { isChatSocketConnected } from '@/lib/chat/socket-bridge';
/** Fallback only when socket is down — one batch request */
const POLL_MS = 2000;

type TypingInboxResponse = {
  active: Array<{
    conversationId: string;
    userId: string;
    displayName: string;
  }>;
};

/**
 * Sidebar typing via socket when connected; otherwise single batch GET.
 */
export function useConversationsTypingPoll(enabled: boolean) {
  const applyPeerTypingFromSocket = useAppStore((s) => s.applyPeerTypingFromSocket);
  const clearPeerTyping = useAppStore((s) => s.clearPeerTyping);
  /** Primitive selector — `.map()` alone returns a new array every snapshot and loops. */
  const conversationIdsKey = useAppStore((s) =>
    s.conversations.map((c) => c.id).join(',')
  );
  const currentUserId = useAppStore((s) => s.currentUser?.id);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || !currentUserId) return;

    const conversationIds = conversationIdsKey
      ? conversationIdsKey.split(',')
      : [];

    let cancelled = false;

    const syncFromBatch = async () => {
      if (cancelled) return;
      if (isChatSocketConnected()) return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;

      try {
        const res = await apiFetch<TypingInboxResponse>('/api/chat/typing', {
          method: 'GET',
        });

        if (cancelled) return;

        const activeIds = new Set(res.active.map((a) => a.conversationId));

        for (const entry of res.active) {
          if (entry.userId === currentUserId) continue;
          const existing = useAppStore
            .getState()
            .conversations.find((c) => c.id === entry.conversationId);
          if (existing?.isPeerTyping) continue;
          const parts = entry.displayName.trim().split(/\s+/);
          applyPeerTypingFromSocket({
            conversationId: entry.conversationId,
            userId: entry.userId,
            isTyping: true,
            user: {
              firstName: parts[0] ?? '',
              lastName: parts.slice(1).join(' '),
            },
          });
        }

        const store = useAppStore.getState();
        for (const conversationId of conversationIds) {
          if (activeIds.has(conversationId)) continue;
          const conv = store.conversations.find((c) => c.id === conversationId);
          if (
            conv?.isPeerTyping ||
            store.typingActivityByConvId[conversationId]
          ) {
            clearPeerTyping(conversationId);
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        /* network / dev offline — silent */
      } finally {
        inFlightRef.current = false;
      }
    };

    void syncFromBatch();
    const id = setInterval(() => void syncFromBatch(), POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      inFlightRef.current = false;
    };
  }, [
    enabled,
    currentUserId,
    conversationIdsKey,
    applyPeerTypingFromSocket,
    clearPeerTyping,
  ]);
}
