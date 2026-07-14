'use client';

import { useEffect, useRef } from 'react';
import { startPollScheduler } from '@/lib/client/poll-scheduler';
import { usePageVisible } from '@/hooks/usePageVisible';

const POLL_INTERVAL_MS = 10_000;
const POLL_JITTER_MS = 4_000;

/**
 * Silent workspace sync — no full-page reload, staggered via jitter + single-flight queue.
 * Pauses while the tab is hidden to reduce load at scale.
 */
export function useWorkspacePolling(
  refreshSilent: (signal?: AbortSignal) => Promise<void>,
  enabled: boolean
) {
  const visible = usePageVisible();
  const wasVisibleRef = useRef(visible);

  useEffect(() => {
    if (!enabled) return;

    const stop = startPollScheduler({
      intervalMs: POLL_INTERVAL_MS,
      jitterMs: POLL_JITTER_MS,
      enabled: true,
      isActive: () => visible,
      run: async (signal) => {
        await refreshSilent(signal);
      },
    });

    return stop;
  }, [enabled, refreshSilent, visible]);

  useEffect(() => {
    if (!enabled) return;
    const becameVisible = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (!becameVisible) return;

    const controller = new AbortController();
    void refreshSilent(controller.signal);
    return () => controller.abort();
  }, [enabled, visible, refreshSilent]);
}
