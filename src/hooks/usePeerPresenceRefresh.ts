'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { mergeOtherUserPresence } from '@/lib/chat/merge-presence';

const REFRESH_MS = 25_000;

/** Keep peer online status in sync with chat-service (REST fallback when socket lags). */
export function usePeerPresenceRefresh(activeConversationId: string | null) {
  const addOrUpdateConversation = useAppStore((s) => s.addOrUpdateConversation);
  const peerUserId = useAppStore((s) =>
    activeConversationId
      ? s.conversations.find((c) => c.id === activeConversationId)?.otherUser?.id
      : undefined
  );

  useEffect(() => {
    if (!activeConversationId || !peerUserId) return;

    const refresh = async () => {
      const existing = useAppStore.getState().conversations.find(
        (c) => c.id === activeConversationId
      )?.otherUser;
      if (!existing?.id) return;

      try {
        const res = await fetch(
          `/api/chat/presence?userIds=${encodeURIComponent(existing.id)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const json = (await res.json()) as { presence?: Record<string, boolean> };
        const online = json.presence?.[existing.id];
        if (online === undefined) return;

        const latest = useAppStore.getState().conversations.find(
          (c) => c.id === activeConversationId
        )?.otherUser;

        addOrUpdateConversation({
          id: activeConversationId,
          otherUser: mergeOtherUserPresence(
            {
              id: existing.id,
              firstName: latest?.firstName ?? existing.firstName ?? '',
              lastName: latest?.lastName ?? existing.lastName ?? '',
              avatar: latest?.avatar ?? existing.avatar,
              online,
              lastSeenAt: latest?.lastSeenAt ?? existing.lastSeenAt,
            },
            latest ?? existing
          ),
        });
      } catch {
        /* ignore */
      }
    };

    void refresh();
    const interval = setInterval(refresh, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [activeConversationId, peerUserId, addOrUpdateConversation]);
}
