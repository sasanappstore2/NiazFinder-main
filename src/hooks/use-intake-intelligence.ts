'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NeedDraft } from '@/contracts/need-intake';
import type { IntakeAnalyzeResponse } from '@/intake/api/intake.dto';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';
import type { CriticalFilterSuggestion } from '@/intake/intelligence-engine/suggestions/critical-filter-suggestions';
import { criticalSuggestionsToChips } from '@/intake/intelligence-engine/suggestions/critical-filter-suggestions';
import { analyzeIntakeTextApi } from '@/lib/intake/intake-analyze-client';
import type { FieldState, IntakeIntelligenceInput } from '@/intake/intelligence-engine/types';
import { draftWithAnalysisSnapshot } from '@/intake/training/buildAnalysisSnapshot';

export interface UseIntakeIntelligenceOptions {
  text: string;
  enabled: boolean;
  citySlug?: string | null;
  cityName?: string | null;
  formHints?: IntakeIntelligenceInput['formHints'];
  debounceMs?: number;
  /** When true, server runs AI extraction even if rules are confident (step 1). */
  forceAi?: boolean;
  onDraft?: (draft: NeedDraft) => void;
}

export interface UseIntakeIntelligenceState {
  analyzing: boolean;
  aiInvoked: boolean;
  analyzedText: string | null;
  fieldMeta: Record<string, FieldState> | null;
  gaps: IntakeParseGap[];
  suggestedFilters: CriticalFilterSuggestion[];
  filterSuggestionChips: Record<string, Array<{ value: string; label: string; confidence?: number }>>;
  latencyMs: number | null;
  error: string | null;
  /** AI one-sentence summary of user need (city, budget, subject). */
  intentGist: string | null;
  /** Flush debounce and run analyze immediately (returns in-flight or fresh result). */
  analyzeNow: () => Promise<IntakeAnalyzeResponse | null>;
  /** Wait for the current in-flight analyze, if any. */
  waitForAnalysis: () => Promise<IntakeAnalyzeResponse | null>;
  isFreshForText: (sourceText: string) => boolean;
}

function formHintsSignature(formHints?: IntakeIntelligenceInput['formHints'], forceAiFlag?: boolean): string {
  const base = formHints ? JSON.stringify(formHints) : '';
  return forceAiFlag ? `${base}|forceAi` : base;
}

export function useIntakeIntelligence({
  text,
  enabled,
  citySlug,
  cityName,
  formHints,
  debounceMs = 400,
  forceAi = false,
  onDraft,
}: UseIntakeIntelligenceOptions): UseIntakeIntelligenceState {
  const [analyzing, setAnalyzing] = useState(false);
  const [aiInvoked, setAiInvoked] = useState(false);
  const [analyzedText, setAnalyzedText] = useState<string | null>(null);
  const [fieldMeta, setFieldMeta] = useState<Record<string, FieldState> | null>(null);
  const [gaps, setGaps] = useState<IntakeParseGap[]>([]);
  const [suggestedFilters, setSuggestedFilters] = useState<CriticalFilterSuggestion[]>([]);
  const [filterSuggestionChips, setFilterSuggestionChips] = useState<
    Record<string, Array<{ value: string; label: string; confidence?: number }>>
  >({});
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intentGist, setIntentGist] = useState<string | null>(null);

  const reqId = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);
  const inflightRef = useRef<Promise<IntakeAnalyzeResponse | null> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastAnalysisRef = useRef<IntakeAnalyzeResponse | null>(null);
  const analyzedTextRef = useRef<string | null>(null);
  const formHintsSigRef = useRef<string>('');
  const forceAiRef = useRef(forceAi);
  const onDraftRef = useRef(onDraft);

  useEffect(() => {
    forceAiRef.current = forceAi;
  }, [forceAi]);

  const cancelInflight = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    inflightRef.current = null;
  }, []);

  useEffect(() => {
    onDraftRef.current = onDraft;
  }, [onDraft]);

  const applyAnalysisResult = useCallback((res: IntakeAnalyzeResponse, trimmed: string, hintsSig: string) => {
    const meta = (res as { fieldMeta?: Record<string, FieldState> }).fieldMeta ?? null;
    const parseGaps = (res as { parseGaps?: IntakeParseGap[] }).parseGaps ?? [];
    const draft = (res as { draft?: NeedDraft }).draft;
    const filters =
      (res as { suggestedFilters?: CriticalFilterSuggestion[] }).suggestedFilters ?? [];

    lastAnalysisRef.current = res;
    analyzedTextRef.current = trimmed;
    formHintsSigRef.current = hintsSig;
    setAnalyzedText(trimmed);
    setFieldMeta(meta);
    setGaps(parseGaps);
    setSuggestedFilters(filters);
    setFilterSuggestionChips(criticalSuggestionsToChips(filters));
    setLatencyMs(res.latencyMs ?? null);
    setAiInvoked(Boolean((res.meta as { aiInvoked?: boolean })?.aiInvoked));
    setIntentGist(
      ((res.meta as { intentGist?: string | null })?.intentGist ?? null)?.trim() || null
    );

    if (draft && onDraftRef.current) {
      onDraftRef.current(draftWithAnalysisSnapshot(draft, res, trimmed));
    }
  }, []);

  const runAnalyze = useCallback(async (): Promise<IntakeAnalyzeResponse | null> => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 3) return null;

    const hintsSig = formHintsSignature(formHints, forceAiRef.current);

    if (
      analyzedTextRef.current === trimmed &&
      formHintsSigRef.current === hintsSig &&
      lastAnalysisRef.current &&
      !inflightRef.current
    ) {
      return lastAnalysisRef.current;
    }

    if (inflightRef.current && analyzedTextRef.current === trimmed && formHintsSigRef.current === hintsSig) {
      return inflightRef.current;
    }

    cancelInflight();

    const id = ++reqId.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setAnalyzing(true);
    setError(null);

    const promise = (async (): Promise<IntakeAnalyzeResponse | null> => {
      try {
        const res = await analyzeIntakeTextApi(trimmed, {
          citySlug: citySlug ?? undefined,
          cityName: cityName ?? undefined,
          formHints,
          forceAi: forceAiRef.current || undefined,
          signal: controller.signal,
        });

        if (id !== reqId.current) return null;

        applyAnalysisResult(res, trimmed, hintsSig);
        return res;
      } catch (e) {
        if (id !== reqId.current) return null;
        if (e instanceof DOMException && e.name === 'AbortError') return null;
        if (e instanceof Error && e.name === 'AbortError') return null;
        setError(e instanceof Error ? e.message : 'analyze failed');
        return null;
      } finally {
        if (id === reqId.current) {
          setAnalyzing(false);
          inflightRef.current = null;
          abortRef.current = null;
        }
      }
    })();

    inflightRef.current = promise;
    return promise;
  }, [text, citySlug, cityName, formHints, applyAnalysisResult, cancelInflight]);

  const analyzeNow = useCallback(async (): Promise<IntakeAnalyzeResponse | null> => {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const trimmed = text.trim();
    const hintsSig = formHintsSignature(formHints, forceAiRef.current);
    if (
      trimmed &&
      analyzedTextRef.current === trimmed &&
      formHintsSigRef.current === hintsSig &&
      lastAnalysisRef.current &&
      !inflightRef.current
    ) {
      return lastAnalysisRef.current;
    }
    if (inflightRef.current) return inflightRef.current;
    return runAnalyze();
  }, [text, formHints, forceAi, runAnalyze]);

  const waitForAnalysis = useCallback(async (): Promise<IntakeAnalyzeResponse | null> => {
    if (inflightRef.current) return inflightRef.current;
    return lastAnalysisRef.current;
  }, []);

  const isFreshForText = useCallback(
    (sourceText: string) => {
      const trimmed = sourceText.trim();
      return (
        analyzedTextRef.current === trimmed &&
        formHintsSigRef.current === formHintsSignature(formHints, forceAi) &&
        lastAnalysisRef.current != null
      );
    },
    [formHints]
  );

  useEffect(() => {
    if (!enabled || !text.trim()) {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setIntentGist(null);
      return;
    }

    const trimmed = text.trim();
    if (trimmed.length < 3) return;

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      const hintsSig = formHintsSignature(formHints, forceAiRef.current);
      if (
        analyzedTextRef.current === trimmed &&
        formHintsSigRef.current === hintsSig &&
        lastAnalysisRef.current
      ) {
        return;
      }
      void runAnalyze();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [enabled, text, formHints, debounceMs, runAnalyze]);

  useEffect(() => () => cancelInflight(), [cancelInflight]);

  return {
    analyzing,
    aiInvoked,
    analyzedText,
    fieldMeta,
    gaps,
    suggestedFilters,
    filterSuggestionChips,
    latencyMs,
    error,
    intentGist,
    analyzeNow,
    waitForAnalysis,
    isFreshForText,
  };
}
