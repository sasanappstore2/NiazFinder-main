'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NeedDraft } from '@/contracts/need-intake';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';
import { analyzeIntakeTextApi } from '@/lib/intake/intake-analyze-client';
import type { FieldState } from '@/intake/intelligence-engine/types';

export interface UseIntakeIntelligenceOptions {
  text: string;
  enabled: boolean;
  citySlug?: string | null;
  cityName?: string | null;
  debounceMs?: number;
  onDraft?: (draft: NeedDraft) => void;
}

export interface UseIntakeIntelligenceState {
  analyzing: boolean;
  aiInvoked: boolean;
  fieldMeta: Record<string, FieldState> | null;
  gaps: IntakeParseGap[];
  latencyMs: number | null;
  error: string | null;
}

export function useIntakeIntelligence({
  text,
  enabled,
  citySlug,
  cityName,
  debounceMs = 600,
  onDraft,
}: UseIntakeIntelligenceOptions): UseIntakeIntelligenceState {
  const [analyzing, setAnalyzing] = useState(false);
  const [aiInvoked, setAiInvoked] = useState(false);
  const [fieldMeta, setFieldMeta] = useState<Record<string, FieldState> | null>(null);
  const [gaps, setGaps] = useState<IntakeParseGap[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const onDraftRef = useRef(onDraft);
  onDraftRef.current = onDraft;

  const runAnalyze = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 3) return;

    const id = ++reqId.current;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await analyzeIntakeTextApi(trimmed, {
        citySlug: citySlug ?? undefined,
        cityName: cityName ?? undefined,
      });

      if (id !== reqId.current) return;

      const meta = (res as { fieldMeta?: Record<string, FieldState> }).fieldMeta ?? null;
      const parseGaps = (res as { parseGaps?: IntakeParseGap[] }).parseGaps ?? [];
      const draft = (res as { draft?: NeedDraft }).draft;

      setFieldMeta(meta);
      setGaps(parseGaps);
      setLatencyMs(res.latencyMs ?? null);
      setAiInvoked(Boolean((res.meta as { aiInvoked?: boolean })?.aiInvoked));

      if (draft && onDraftRef.current) {
        onDraftRef.current(draft);
      }
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof Error ? e.message : 'analyze failed');
    } finally {
      if (id === reqId.current) setAnalyzing(false);
    }
  }, [text, citySlug, cityName]);

  useEffect(() => {
    if (!enabled || !text.trim()) {
      setAnalyzing(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void runAnalyze();
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [enabled, text, debounceMs, runAnalyze]);

  return { analyzing, aiInvoked, fieldMeta, gaps, latencyMs, error };
}
