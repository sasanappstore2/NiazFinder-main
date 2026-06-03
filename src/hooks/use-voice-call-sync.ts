'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  applyServerStatus,
  pollIncomingCalls,
} from '@/lib/voice/call-controller';

const POLL_MS = 1_000;

/**
 * Unified voice call sync: incoming discovery + server status for both roles.
 */
export function useVoiceCallSync() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const voiceCallOpen = useAppStore((s) => s.voiceCallOpen);
  const voiceCallId = useAppStore((s) => s.voiceCallId);
  const voiceCallStatus = useAppStore((s) => s.voiceCallStatus);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;

      const state = useAppStore.getState();

      if (state.voiceCallOpen && state.voiceCallId) {
        await applyServerStatus(state.voiceCallId);
        return;
      }

      if (!state.voiceCallOpen) {
        await pollIncomingCalls();
      }
    };

    void tick();
    const id = setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated, voiceCallOpen, voiceCallId, voiceCallStatus]);
}
