'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getTypingSocketConfig } from '@/lib/typing-socket-config';
import type { TypingAnalysisResult } from '@/contracts/typing-analysis';

const MAX_RECONNECT_ATTEMPTS = 8;
const NAMESPACE = '/intake-typing';

export interface IntakeTypingSocketAPI {
  isConnected: boolean;
  analyze: (text: string, seq: number) => void;
  cancel: () => void;
}

export function useIntakeTypingSocket(
  sessionId: string,
  handlers: {
    onResult: (result: TypingAnalysisResult) => void;
    onSuggestions?: (items: string[]) => void;
    onError?: (payload: { code: string; message: string; retryAfterMs?: number }) => void;
  }
): IntakeTypingSocketAPI {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    if (!sessionId) return;

    const { url, path, enabled } = getTypingSocketConfig();
    if (!enabled || !url) return;

    if (socketRef.current?.connected) return;

    const socket = io(`${url}${NAMESPACE}`, {
      path,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 15_000,
      query: { sessionId },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
      socket.emit('typing.join', { sessionId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      reconnectAttemptRef.current += 1;
      setIsConnected(false);
    });

    socket.on('typing.result', (result: TypingAnalysisResult) => {
      handlersRef.current.onResult(result);
    });

    socket.on('typing.suggestions', (data: { items?: string[] }) => {
      if (data?.items?.length) {
        handlersRef.current.onSuggestions?.(data.items);
      }
    });

    socket.on(
      'typing.error',
      (data: { code: string; message: string; retryAfterMs?: number }) => {
        handlersRef.current.onError?.(data);
      }
    );
  }, [sessionId]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [connect]);

  const analyze = useCallback(
    (text: string, seq: number) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit('typing.analyze', { sessionId, text, seq });
    },
    [sessionId]
  );

  const cancel = useCallback(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('typing.cancel', { sessionId });
  }, [sessionId]);

  return { isConnected, analyze, cancel };
}
