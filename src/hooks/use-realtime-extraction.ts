/**
 * Real-time smart extraction hook — edge-case hardened (Claude #4).
 * Calls server API — never imports smart-extractor into the client bundle.
 *
 * Debounce is ref + setTimeout (not the `debounce` package): that package
 * throws "Debounced method called with different contexts..." when the
 * returned hook object identity changes between renders and extract is
 * invoked as `smartRealtime.extract(...)`.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  SmartExtractionOptions,
  SmartExtractionResult,
} from '@/intake/smart-extractor/types';
import {
  trackSmartExtractionRequest,
  trackSmartExtractionResponse,
} from '@/lib/need-intake/smart/telemetry/smart-intake-telemetry';
import { shouldAcceptSmartResponse } from '@/lib/need-intake/intake-merge-policy';

const ZW_RE = /[\u200B\u200C\u200D\uFEFF]/g;
const MAX_CHARS = 5000;
const MIN_CHARS = 3;

/** Strip zero-width / BOM characters. */
export function sanitizeIntakeText(text: string): string {
  return text.replace(ZW_RE, '');
}

/** Truncate at word boundary when possible (max 5000). */
export function truncateIntakeText(text: string, max = MAX_CHARS): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  console.warn(`Intake text truncated from ${text.length} to ${cut.length} chars`);
  return cut;
}

export function prepareIntakeTexts(needText: string, detailsText = '') {
  const need = truncateIntakeText(sanitizeIntakeText(needText));
  const details = truncateIntakeText(sanitizeIntakeText(detailsText));
  const combined = `${need}\n${details}`.trim();
  return {
    needText: need,
    detailsText: details,
    tooShort: combined.length < MIN_CHARS,
    textLength: need.length + details.length,
  };
}

export function resolveRealtimeDebounceMs(explicit?: number): number {
  if (typeof explicit === 'number' && explicit > 0) return explicit;
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 500;
  return 300;
}

export function intakeTextSignature(needText: string, detailsText = ''): string {
  const prepared = prepareIntakeTexts(needText, detailsText);
  return `${prepared.needText}\n${prepared.detailsText}`;
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    err.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed')
  );
}

export interface UseRealtimeExtractionOptions {
  debounceMs?: number;
  preferredCity?: string;
  preferredCitySlug?: string;
  useAI?: boolean;
  enabled?: boolean;
  onResult?: (result: SmartExtractionResult) => void;
}

export type SmartExtractionResultWithMeta = SmartExtractionResult & {
  _sourceSig?: string;
  _requestId?: number;
};

export function useRealtimeExtraction(options: UseRealtimeExtractionOptions = {}) {
  const {
    preferredCity,
    preferredCitySlug,
    useAI = false,
    enabled = true,
    onResult,
  } = options;

  const debounceMs = resolveRealtimeDebounceMs(options.debounceMs);

  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<SmartExtractionResultWithMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const retryRef = useRef(0);
  const requestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const preferredCityRef = useRef(preferredCity);
  const preferredCitySlugRef = useRef(preferredCitySlug);
  const useAIRef = useRef(useAI);
  const enabledRef = useRef(enabled);
  const debounceMsRef = useRef(debounceMs);
  preferredCityRef.current = preferredCity;
  preferredCitySlugRef.current = preferredCitySlug;
  useAIRef.current = useAI;
  enabledRef.current = enabled;
  debounceMsRef.current = debounceMs;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const extractNow = useCallback(
    async (needText: string, detailsText = '', override?: SmartExtractionOptions) => {
      const prepared = prepareIntakeTexts(needText, detailsText);
      const sourceSig = `${prepared.needText}\n${prepared.detailsText}`;
      const requestId = ++requestIdRef.current;

      if (prepared.tooShort) {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setResult(null);
          setError(null);
          setExtracting(false);
        }
        return null;
      }

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (mountedRef.current) {
        setExtracting(true);
        setError(null);
      }

      const started = Date.now();
      const ai = useAIRef.current;
      trackSmartExtractionRequest({
        textLength: prepared.textLength,
        modelId: ai ? 'hybrid' : 'rules',
      });

      const attemptFetch = async (): Promise<SmartExtractionResult | null> => {
        const res = await fetch('/api/intake/smart-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            needText: prepared.needText,
            detailsText: prepared.detailsText,
            options: {
              preferredCity: preferredCityRef.current,
              preferredCitySlug: preferredCitySlugRef.current,
              useAI: ai,
              realTime: true,
              useRules: true,
              ...override,
            },
          }),
        });
        if (!res.ok) {
          throw new Error(`smart-extract HTTP ${res.status}`);
        }
        return (await res.json()) as SmartExtractionResult;
      };

      const isCurrent = () => mountedRef.current && requestId === requestIdRef.current;

      try {
        let data: SmartExtractionResult | null = null;
        try {
          data = await attemptFetch();
          retryRef.current = 0;
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return null;
          if (isNetworkError(err) && retryRef.current < 2) {
            retryRef.current += 1;
            const delay = retryRef.current === 1 ? 1000 : 2000;
            await new Promise((r) => setTimeout(r, delay));
            if (controller.signal.aborted || !isCurrent()) return null;
            data = await attemptFetch();
            retryRef.current = 0;
          } else {
            throw err;
          }
        }

        trackSmartExtractionResponse({
          result: data,
          latencyMs: Date.now() - started,
        });
        // Accept only when still the latest request for this exact text signature
        // and the hook remains enabled (compose step). Drop stale/out-of-order.
        if (
          data &&
          shouldAcceptSmartResponse({
            incomingRequestId: requestId,
            currentRequestId: requestIdRef.current,
            incomingSourceSig: sourceSig,
            currentSourceSig: sourceSig,
            isComposeStep: enabledRef.current,
          }) &&
          isCurrent()
        ) {
          const withMeta: SmartExtractionResultWithMeta = {
            ...data,
            _sourceSig: sourceSig,
            _requestId: requestId,
          };
          setResult(withMeta);
          onResultRef.current?.(withMeta);
        }
        return data;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return null;
        const message = err instanceof Error ? err.message : 'extraction failed';
        trackSmartExtractionResponse({
          result: null,
          latencyMs: Date.now() - started,
          error: message,
        });
        if (isCurrent()) setError(message);
        return null;
      } finally {
        if (isCurrent()) setExtracting(false);
      }
    },
    []
  );

  const extract = useCallback(
    (needText: string, detailsText = '') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
      requestIdRef.current += 1;
      setResult(null);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!enabledRef.current) return;
        void extractNow(needText, detailsText);
      }, debounceMsRef.current);
    },
    [extractNow]
  );

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    extract,
    extractNow,
    extracting,
    result,
    error,
    clear,
  };
}
