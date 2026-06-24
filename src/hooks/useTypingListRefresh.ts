'use client';

import { useEffect, useReducer } from 'react';
import { useAppStore } from '@/lib/store';

// Mirrors the TTL in store.isConversationTyping — a typing label is live for
// this long after the last typing event.
const TYPING_TTL_MS = 3500;

/**
 * Expire typing labels in the conversation list WITHOUT a fixed 400ms re-render
 * loop. Schedule a single timeout to the soonest label expiry, re-render then,
 * and reschedule for the next one. Result: the list re-renders only when a label
 * actually crosses its TTL (≈once per typing burst) instead of ~2.5×/second.
 */
export function useTypingListRefresh(enabled: boolean) {
  const [tick, bump] = useReducer((n: number) => n + 1, 0);
  const typingActivityByConvId = useAppStore((s) => s.typingActivityByConvId);

  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();
    // Expiry instants still in the future (an already-expired entry needs no timer).
    const future = Object.values(typingActivityByConvId)
      .map((t) => t + TYPING_TTL_MS)
      .filter((exp) => exp > now);
    if (future.length === 0) return;

    // +50ms so the post-timeout recompute sees the entry as expired.
    const delay = Math.min(...future) - now + 50;
    const id = setTimeout(bump, delay);
    return () => clearTimeout(id);
    // `tick` re-runs the effect after each fire so multi-conversation expiries
    // chain correctly; `typingActivityByConvId` reschedules on new typing events.
  }, [enabled, typingActivityByConvId, tick]);
}
