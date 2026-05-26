'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TypingAnalysisResult } from '@/contracts/typing-analysis';
import { useNeedIntakeStore } from '@/stores/need-intake-store';
import { useDebouncedTyping } from './use-debounced-typing';
import { useIntakeTypingSocket } from './use-intake-typing-socket';
import { getTypingSocketConfig } from '@/lib/typing-socket-config';
import { hashTypingText } from '@/lib/typing-analysis/hash';

const PRELOAD_CONFIDENCE = 0.72;
const STABLE_MATCHES = 2;

async function fetchTypingAnalysis(
  sessionId: string,
  text: string,
  seq: number,
  city?: string
): Promise<TypingAnalysisResult | null> {
  const res = await fetch('/api/need-intake/typing-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, text, seq, locale: 'fa', city }),
  });
  const json = (await res.json()) as {
    ok: boolean;
    result?: TypingAnalysisResult;
    error?: string;
    retryAfterMs?: number;
  };
  if (!res.ok || !json.ok || !json.result) return null;
  return json.result;
}

export function useTypingAnalysis(options?: { city?: string; enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const city = options?.city;
  const queryClient = useQueryClient();

  const {
    typingAnalysis,
    setTypingAnalysis,
    setAnalysisStatus,
    setTypingPreloading,
  } = useNeedIntakeStore();

  const setTypingSessionId = useNeedIntakeStore((s) => s.setTypingSessionId);
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}`
  );

  useEffect(() => {
    setTypingSessionId(sessionId);
  }, [setTypingSessionId, sessionId]);
  const seqRef = useRef(0);
  const latestSeqRef = useRef(0);
  const lastTextRef = useRef('');
  const categoryStreakRef = useRef<string[]>([]);

  const applyResult = useCallback(
    (result: TypingAnalysisResult) => {
      if (result.seq != null && result.seq < latestSeqRef.current) return;
      setTypingAnalysis(result);
      setAnalysisStatus('ready');

      if (result.preloads?.specialists || result.preloads?.requests) {
        const slug = result.categorySlug;
        const streak = [...categoryStreakRef.current, slug].slice(-STABLE_MATCHES);
        categoryStreakRef.current = streak;

        const stable =
          result.confidence >= PRELOAD_CONFIDENCE &&
          streak.length >= STABLE_MATCHES &&
          streak.every((s) => s === slug && s && s !== 'services');

        if (stable) {
          setTypingPreloading(true);
          const catQ = `category=${encodeURIComponent(slug)}&limit=12`;
          const cityQ = city ? `&city=${encodeURIComponent(city)}` : '';
          void Promise.all([
            queryClient.prefetchQuery({
              queryKey: ['preload', 'specialists', slug, city ?? ''],
              queryFn: () =>
                fetch(`/api/specialists?${catQ}${cityQ}`).then((r) => r.json()),
              staleTime: 5 * 60_000,
            }),
            queryClient.prefetchQuery({
              queryKey: ['preload', 'requests', slug, city ?? ''],
              queryFn: () =>
                fetch(`/api/requests?${catQ}${cityQ}`).then((r) => r.json()),
              staleTime: 5 * 60_000,
            }),
          ]).finally(() => setTypingPreloading(false));
        }
      }
    },
    [city, queryClient, setAnalysisStatus, setTypingAnalysis, setTypingPreloading]
  );

  const socketApi = useIntakeTypingSocket(sessionId, {
    onResult: applyResult,
    onSuggestions: (items) => {
      const current = useNeedIntakeStore.getState().typingAnalysis;
      if (current) {
        setTypingAnalysis({ ...current, suggestions: items });
      }
    },
    onError: () => setAnalysisStatus('error'),
  });

  const runAnalyze = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!enabled || trimmed.length < 3) {
        setTypingAnalysis(null);
        setAnalysisStatus('idle');
        return;
      }

      if (hashTypingText(trimmed) === hashTypingText(lastTextRef.current)) {
        const current = useNeedIntakeStore.getState().typingAnalysis;
        if (current?.textHash === hashTypingText(trimmed)) return;
      }
      lastTextRef.current = trimmed;

      const seq = ++seqRef.current;
      latestSeqRef.current = seq;
      setAnalysisStatus('analyzing');

      const { enabled: wsEnabled } = getTypingSocketConfig();
      if (wsEnabled && socketApi.isConnected) {
        socketApi.analyze(trimmed, seq);
        return;
      }

      const result = await fetchTypingAnalysis(sessionId, trimmed, seq, city);
      if (result) applyResult({ ...result, seq });
      else setAnalysisStatus('error');
    },
    [
      enabled,
      city,
      applyResult,
      setAnalysisStatus,
      setTypingAnalysis,
      socketApi,
    ]
  );

  const debouncedAnalyze = useDebouncedTyping((text: string) => {
    void runAnalyze(text);
  }, 400);

  const onTextChange = useCallback(
    (text: string) => {
      if (!enabled) return;
      if (text.trim().length < 3) {
        setTypingAnalysis(null);
        setAnalysisStatus('idle');
        categoryStreakRef.current = [];
        return;
      }
      debouncedAnalyze(text);
    },
    [debouncedAnalyze, enabled, setAnalysisStatus, setTypingAnalysis]
  );

  const resetTyping = useCallback(() => {
    seqRef.current = 0;
    latestSeqRef.current = 0;
    lastTextRef.current = '';
    categoryStreakRef.current = [];
    setTypingAnalysis(null);
    setAnalysisStatus('idle');
    setTypingPreloading(false);
    socketApi.cancel();
  }, [
    setAnalysisStatus,
    setTypingAnalysis,
    setTypingPreloading,
    socketApi,
  ]);

  return {
    sessionId,
    typingAnalysis,
    analysisStatus: useNeedIntakeStore((s) => s.analysisStatus),
    typingPreloading: useNeedIntakeStore((s) => s.typingPreloading),
    isSocketConnected: socketApi.isConnected,
    onTextChange,
    resetTyping,
    runAnalyzeNow: runAnalyze,
  };
}
