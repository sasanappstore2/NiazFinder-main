'use client';

import { useCallback, useEffect, useRef } from 'react';
import { tryEmitTyping } from '@/lib/chat/socket-bridge';

const EMIT_INTERVAL_MS = 300;
/** بعد از این مدت بدون keystroke، تایپینگ قطع می‌شود */
const TYPING_IDLE_MS = 3000;

/**
 * Typing presence via Socket.io only.
 */
export function useChatTypingEmitter(conversationId: string | null) {
  const lastEmitAt = useRef(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const emitTypingNow = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      tryEmitTyping(conversationId, isTyping);
    },
    [conversationId]
  );

  const stopTyping = useCallback(() => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current);
      pendingRef.current = null;
    }
    if (idleStopRef.current) {
      clearTimeout(idleStopRef.current);
      idleStopRef.current = null;
    }
    isTypingRef.current = false;
    emitTypingNow(false);
  }, [emitTypingNow]);

  const scheduleIdleStop = useCallback(() => {
    if (idleStopRef.current) clearTimeout(idleStopRef.current);
    idleStopRef.current = setTimeout(() => {
      idleStopRef.current = null;
      if (!isTypingRef.current) return;
      isTypingRef.current = false;
      emitTypingNow(false);
    }, TYPING_IDLE_MS);
  }, [emitTypingNow]);

  const onDraftChange = useCallback(
    (text: string) => {
      if (!conversationId) return;

      if (!text.trim()) {
        stopTyping();
        return;
      }

      isTypingRef.current = true;

      const now = Date.now();
      const elapsed = now - lastEmitAt.current;

      const fire = () => {
        lastEmitAt.current = Date.now();
        emitTypingNow(true);
        scheduleIdleStop();
      };

      if (elapsed >= EMIT_INTERVAL_MS) {
        fire();
        return;
      }

      if (pendingRef.current) clearTimeout(pendingRef.current);
      pendingRef.current = setTimeout(() => {
        pendingRef.current = null;
        fire();
      }, EMIT_INTERVAL_MS - elapsed);
    },
    [conversationId, emitTypingNow, stopTyping, scheduleIdleStop]
  );

  useEffect(() => {
    return () => stopTyping();
  }, [conversationId, stopTyping]);

  return { onDraftChange, stopTyping };
}
