'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  analyzePostNaturalText,
} from '@/lib/need-intake/si/post-natural-client';
import type {
  PostNaturalAnalyzeRequest,
  PostNaturalAnalyzeResponse,
} from '@/lib/need-intake/si/post-natural-contract';

export interface UsePostNaturalAnalysisOptions {
  buildRequest: () => PostNaturalAnalyzeRequest;
}

export interface UsePostNaturalAnalysisState {
  analyzing: boolean;
  error: string | null;
  result: PostNaturalAnalyzeResponse | null;
  analyzeNow: () => Promise<PostNaturalAnalyzeResponse | null>;
  clear: () => void;
}

export function usePostNaturalAnalysis({
  buildRequest,
}: UsePostNaturalAnalysisOptions): UsePostNaturalAnalysisState {
  const buildRequestRef = useRef(buildRequest);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PostNaturalAnalyzeResponse | null>(null);

  useEffect(() => {
    buildRequestRef.current = buildRequest;
  }, [buildRequest]);

  const clear = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setAnalyzing(false);
    setError(null);
    setResult(null);
  }, []);

  const analyzeNow = useCallback(async (): Promise<PostNaturalAnalyzeResponse | null> => {
    const payload = buildRequestRef.current();
    if (payload.sourceText.trim().length < 3) {
      setError('برای تحلیل، نیاز را کامل‌تر بنویسید.');
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++requestIdRef.current;
    setAnalyzing(true);
    setError(null);

    try {
      const response = await analyzePostNaturalText(payload, { signal: controller.signal });
      if (id !== requestIdRef.current) return null;
      setResult(response);
      return response;
    } catch (cause) {
      if (id !== requestIdRef.current) return null;
      if (cause instanceof DOMException && cause.name === 'AbortError') return null;
      if (cause instanceof Error && cause.name === 'AbortError') return null;
      setError(cause instanceof Error ? cause.message : 'تحلیل طبیعی ناموفق بود');
      setResult(null);
      return null;
    } finally {
      if (id === requestIdRef.current) {
        setAnalyzing(false);
        abortRef.current = null;
      }
    }
  }, []);

  useEffect(() => () => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
  }, []);

  return { analyzing, error, result, analyzeNow, clear };
}
