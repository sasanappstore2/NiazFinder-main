'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NeedDraft } from '@/contracts/need-intake';
import type { IntakeAnalyzeResponse } from '@/intake/api/intake.dto';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';
import type { CriticalFilterSuggestion } from '@/intake/intelligence-engine/suggestions/critical-filter-suggestions';
import { criticalSuggestionsToChips } from '@/intake/intelligence-engine/suggestions/critical-filter-suggestions';
import { analyzeIntakeTextApi } from '@/lib/intake/intake-analyze-client';
import {
  getIntakeAnalysisMode,
  type IntakeAnalysisMode,
} from '@/lib/intake/rules-only-mode';
import type { FieldState, IntakeIntelligenceInput } from '@/intake/intelligence-engine/types';
import type { IntakeAgentResult } from '@/intake/agent/types';
import { draftWithAnalysisSnapshot } from '@/intake/training/buildAnalysisSnapshot';

const ENRICH_PAUSE_MS = 1200;

export interface UseIntakeIntelligenceOptions {
  text: string;
  enabled: boolean;
  citySlug?: string | null;
  cityName?: string | null;
  formHints?: IntakeIntelligenceInput['formHints'];
  debounceMs?: number;
  /** Unused on live compose — kept for callers that previously forced AI. */
  forceAi?: boolean;
  onDraft?: (draft: NeedDraft) => void;
}

export interface UseIntakeIntelligenceState {
  analyzing: boolean;
  enriching: boolean;
  aiInvoked: boolean;
  analysisMode: IntakeAnalysisMode;
  analyzedText: string | null;
  fieldMeta: Record<string, FieldState> | null;
  gaps: IntakeParseGap[];
  suggestedFilters: CriticalFilterSuggestion[];
  filterSuggestionChips: Record<string, Array<{ value: string; label: string; confidence?: number }>>;
  latencyMs: number | null;
  error: string | null;
  /** AI one-sentence summary of user need (city, budget, subject). */
  intentGist: string | null;
  /** Product agent projection (same schema for rules / LLM). */
  agent: IntakeAgentResult | null;
  /** Flush debounce and run analyze immediately (returns in-flight or fresh result). */
  analyzeNow: () => Promise<IntakeAnalyzeResponse | null>;
  /** Wait for the current in-flight analyze, if any. */
  waitForAnalysis: () => Promise<IntakeAnalyzeResponse | null>;
  isFreshForText: (sourceText: string) => boolean;
}

function formHintsSignature(formHints?: IntakeIntelligenceInput['formHints']): string {
  return formHints ? JSON.stringify(formHints) : '';
}

function responseNeedsEnrich(res: IntakeAnalyzeResponse | null): boolean {
  return Boolean((res?.meta as { needsEnrich?: boolean } | undefined)?.needsEnrich);
}

export function useIntakeIntelligence({
  text,
  enabled,
  citySlug,
  cityName,
  formHints,
  debounceMs = 400,
  onDraft,
}: UseIntakeIntelligenceOptions): UseIntakeIntelligenceState {
  const [analyzing, setAnalyzing] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [aiInvoked, setAiInvoked] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<IntakeAnalysisMode>(() =>
    getIntakeAnalysisMode()
  );
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
  const [agent, setAgent] = useState<IntakeAgentResult | null>(null);

  const reqId = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);
  const enrichTimerRef = useRef<number | null>(null);
  const inflightRef = useRef<Promise<IntakeAnalyzeResponse | null> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastAnalysisRef = useRef<IntakeAnalyzeResponse | null>(null);
  const analyzedTextRef = useRef<string | null>(null);
  const formHintsSigRef = useRef<string>('');
  const lastEnrichTextRef = useRef<string | null>(null);
  const onDraftRef = useRef(onDraft);

  const cancelInflight = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    inflightRef.current = null;
  }, []);

  const cancelEnrichTimer = useCallback(() => {
    if (enrichTimerRef.current != null) {
      window.clearTimeout(enrichTimerRef.current);
      enrichTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    onDraftRef.current = onDraft;
  }, [onDraft]);

  const applyAnalysisResult = useCallback((res: IntakeAnalyzeResponse, trimmed: string, hintsSig: string) => {
    const fieldMetaPayload = (res as { fieldMeta?: Record<string, FieldState> }).fieldMeta ?? null;
    const parseGaps = (res as { parseGaps?: IntakeParseGap[] }).parseGaps ?? [];
    const draft = (res as { draft?: NeedDraft }).draft;
    const filters =
      (res as { suggestedFilters?: CriticalFilterSuggestion[] }).suggestedFilters ?? [];
    const responseMeta = res.meta as {
      aiInvoked?: boolean;
      analysisMode?: IntakeAnalysisMode;
      intentGist?: string | null;
    } | undefined;

    lastAnalysisRef.current = res;
    analyzedTextRef.current = trimmed;
    formHintsSigRef.current = hintsSig;
    setAnalyzedText(trimmed);
    setFieldMeta(fieldMetaPayload);
    setGaps(parseGaps);
    setSuggestedFilters(filters);
    setFilterSuggestionChips(criticalSuggestionsToChips(filters));
    setLatencyMs(res.latencyMs ?? null);
    setAiInvoked(Boolean(responseMeta?.aiInvoked));
    if (responseMeta?.analysisMode === 'ai' || responseMeta?.analysisMode === 'rules') {
      setAnalysisMode(responseMeta.analysisMode);
    }
    const gist = responseMeta?.intentGist?.trim() || null;
    if (gist) setIntentGist(gist);
    const agentPayload = (res as { agent?: IntakeAgentResult }).agent ?? null;
    if (agentPayload) setAgent(agentPayload);

    if (draft && onDraftRef.current) {
      onDraftRef.current(draftWithAnalysisSnapshot(draft, res, trimmed));
    }
  }, []);

  const runAnalyze = useCallback(async (mode: 'fast' | 'enrich'): Promise<IntakeAnalyzeResponse | null> => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 3) return null;

    const hintsSig = formHintsSignature(formHints);
    const enrich = mode === 'enrich';

    if (
      !enrich &&
      analyzedTextRef.current === trimmed &&
      formHintsSigRef.current === hintsSig &&
      lastAnalysisRef.current &&
      !inflightRef.current
    ) {
      return lastAnalysisRef.current;
    }

    if (
      !enrich &&
      inflightRef.current &&
      analyzedTextRef.current === trimmed &&
      formHintsSigRef.current === hintsSig
    ) {
      return inflightRef.current;
    }

    if (enrich && lastEnrichTextRef.current === trimmed) {
      return lastAnalysisRef.current;
    }

    cancelInflight();

    const id = ++reqId.current;
    const controller = new AbortController();
    abortRef.current = controller;
    if (enrich) {
      setEnriching(true);
    } else {
      setAnalyzing(true);
    }
    setError(null);

    const promise = (async (): Promise<IntakeAnalyzeResponse | null> => {
      try {
        const res = await analyzeIntakeTextApi(trimmed, {
          citySlug: citySlug ?? undefined,
          cityName: cityName ?? undefined,
          formHints,
          enrich: enrich || undefined,
          signal: controller.signal,
        });

        if (id !== reqId.current) return null;

        applyAnalysisResult(res, trimmed, hintsSig);
        if (enrich) lastEnrichTextRef.current = trimmed;
        return res;
      } catch (e) {
        if (id !== reqId.current) return null;
        if (e instanceof DOMException && e.name === 'AbortError') return null;
        if (e instanceof Error && e.name === 'AbortError') return null;
        setError(e instanceof Error ? e.message : 'analyze failed');
        return null;
      } finally {
        if (id === reqId.current) {
          if (enrich) setEnriching(false);
          else setAnalyzing(false);
          inflightRef.current = null;
          abortRef.current = null;
        }
      }
    })();

    inflightRef.current = promise;
    return promise;
  }, [text, citySlug, cityName, formHints, applyAnalysisResult, cancelInflight]);

  const scheduleEnrich = useCallback(
    (trimmed: string) => {
      cancelEnrichTimer();
      enrichTimerRef.current = window.setTimeout(() => {
        enrichTimerRef.current = null;
        if (text.trim() !== trimmed) return;
        if (lastEnrichTextRef.current === trimmed) return;
        void runAnalyze('enrich');
      }, ENRICH_PAUSE_MS);
    },
    [cancelEnrichTimer, runAnalyze, text]
  );

  const analyzeNow = useCallback(async (): Promise<IntakeAnalyzeResponse | null> => {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const trimmed = text.trim();
    const hintsSig = formHintsSignature(formHints);
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
    return runAnalyze('fast');
  }, [text, formHints, runAnalyze]);

  const waitForAnalysis = useCallback(async (): Promise<IntakeAnalyzeResponse | null> => {
    if (inflightRef.current) return inflightRef.current;
    return lastAnalysisRef.current;
  }, []);

  const isFreshForText = useCallback(
    (sourceText: string) => {
      const trimmed = sourceText.trim();
      return (
        analyzedTextRef.current === trimmed &&
        formHintsSigRef.current === formHintsSignature(formHints) &&
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
      cancelEnrichTimer();
      setIntentGist(null);
      setAgent(null);
      return;
    }

    const trimmed = text.trim();
    if (trimmed.length < 3) return;

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      const hintsSig = formHintsSignature(formHints);
      if (
        analyzedTextRef.current === trimmed &&
        formHintsSigRef.current === hintsSig &&
        lastAnalysisRef.current
      ) {
        if (responseNeedsEnrich(lastAnalysisRef.current) && lastEnrichTextRef.current !== trimmed) {
          scheduleEnrich(trimmed);
        }
        return;
      }
      void runAnalyze('fast').then((res) => {
        if (res && responseNeedsEnrich(res) && text.trim() === trimmed) {
          scheduleEnrich(trimmed);
        }
      });
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [enabled, text, formHints, debounceMs, runAnalyze, scheduleEnrich, cancelEnrichTimer]);

  useEffect(() => () => {
    cancelInflight();
    cancelEnrichTimer();
  }, [cancelInflight, cancelEnrichTimer]);

  return {
    analyzing,
    enriching,
    aiInvoked,
    analysisMode,
    analyzedText,
    fieldMeta,
    gaps,
    suggestedFilters,
    filterSuggestionChips,
    latencyMs,
    error,
    intentGist,
    agent,
    analyzeNow,
    waitForAnalysis,
    isFreshForText,
  };
}
