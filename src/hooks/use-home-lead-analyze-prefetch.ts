'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeIntakeTextApi } from '@/lib/intake/intake-analyze-client';
import { getIntakeAnalysisMode } from '@/lib/intake/rules-only-mode';
import { apiFetch } from '@/lib/api-client';

export type HomeLeadPrefetchStatus = 'idle' | 'pending' | 'ready' | 'error';

export interface UseHomeLeadAnalyzePrefetchOptions {
  text: string;
  citySlug?: string | null;
  cityName?: string | null;
  /** Debounce before firing analyze (ms). */
  debounceMs?: number;
  /** Minimum trimmed length before prefetch. */
  minChars?: number;
  enabled?: boolean;
}

export interface UseHomeLeadAnalyzePrefetchResult {
  status: HomeLeadPrefetchStatus;
  /** True while a request is in flight for the current/latest text. */
  prefetching: boolean;
  /** Flush debounce and wait for the latest in-flight analyze (short timeout). */
  flushPrefetch: (timeoutMs?: number) => Promise<void>;
}

/**
 * Background-warm `/api/intake/analyze` (+ smart-extract) while the user types
 * on the home lead box so `/post` hits a warm server cache.
 */
export function useHomeLeadAnalyzePrefetch({
  text,
  citySlug,
  cityName,
  debounceMs = 700,
  minChars = 8,
  enabled = true,
}: UseHomeLeadAnalyzePrefetchOptions): UseHomeLeadAnalyzePrefetchResult {
  const [status, setStatus] = useState<HomeLeadPrefetchStatus>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);
  const lastReadySigRef = useRef<string>('');
  const forceAi = getIntakeAnalysisMode() === 'ai';

  const signature = (t: string) =>
    `${t.trim()}|${citySlug ?? ''}|${cityName ?? ''}|${forceAi ? 'ai' : 'rules'}`;

  const runPrefetch = useCallback(
    async (trimmed: string): Promise<void> => {
      const sig = signature(trimmed);
      if (sig === lastReadySigRef.current) {
        setStatus('ready');
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus('pending');

      let work: Promise<void> | null = null;
      work = (async () => {
        try {
          const analyzePromise = analyzeIntakeTextApi(trimmed, {
            citySlug: citySlug ?? undefined,
            cityName: cityName ?? undefined,
            forceAi: forceAi || undefined,
            signal: controller.signal,
          });

          // Warm smart-extract cache in parallel (best-effort; ignore failures).
          const smartPromise = apiFetch('/api/intake/smart-extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              needText: trimmed,
              detailsText: '',
              options: {
                preferredCity: cityName ?? undefined,
                preferredCitySlug: citySlug ?? undefined,
                useAI: false,
                realTime: true,
                useRules: true,
              },
            }),
          }).catch(() => null);

          await Promise.all([analyzePromise, smartPromise]);
          if (controller.signal.aborted) return;
          lastReadySigRef.current = sig;
          setStatus('ready');
        } catch (e) {
          if (controller.signal.aborted) return;
          if (e instanceof DOMException && e.name === 'AbortError') return;
          if (e instanceof Error && e.name === 'AbortError') return;
          setStatus('error');
        } finally {
          if (work && inflightRef.current === work) inflightRef.current = null;
        }
      })();

      inflightRef.current = work;
      await work;
    },
    [citySlug, cityName, forceAi]
  );

  useEffect(() => {
    if (!enabled) return;
    const trimmed = text.trim();
    if (trimmed.length < minChars) {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      abortRef.current?.abort();
      setStatus(trimmed.length === 0 ? 'idle' : 'idle');
      return;
    }

    if (signature(trimmed) === lastReadySigRef.current) {
      setStatus('ready');
      return;
    }

    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void runPrefetch(trimmed);
    }, debounceMs);

    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, citySlug, cityName, debounceMs, minChars, enabled, runPrefetch, forceAi]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const flushPrefetch = useCallback(
    async (timeoutMs = 2500) => {
      const trimmed = text.trim();
      if (!enabled || trimmed.length < minChars) return;

      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (signature(trimmed) === lastReadySigRef.current) return;

      const pending = runPrefetch(trimmed);
      await Promise.race([
        pending,
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, timeoutMs);
        }),
      ]);
    },
    [text, enabled, minChars, runPrefetch, forceAi, citySlug, cityName]
  );

  return {
    status,
    prefetching: status === 'pending',
    flushPrefetch,
  };
}
