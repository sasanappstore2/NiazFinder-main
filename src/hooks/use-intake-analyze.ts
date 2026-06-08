'use client';

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { toast } from 'sonner';
import type { ParsedIntent, NeedDraft, IntakeStep } from '@/contracts/need-intake';
import type { IntakeAnalysisResult } from '@/intake/types';
import type { IntakeAnalysisTrace } from '@/intake/training/trainingExample';
import type { City } from '@/lib/location-system';
import { analyzeIntakeTextApi } from '@/lib/intake/intake-analyze-client';
import {
  canProceedToIntakeLocation,
  composeIntakeSourceText,
} from '@/lib/need-intake/compose-source-text';
import { normalizeCategoryPair } from '@/config/categories';
import { recomputeNeedDraft } from '@/intake/aggregate/needDraftAggregate';
import type { IntakeAiShardKey, IntakeAiShardStatus } from '@/components/need-intake/IntakeAiShardBar';
import { shardStatusFromNeedDraft } from '@/components/need-intake/intake-shard-status';

export interface UseIntakeAnalyzeOptions {
  needText: string;
  detailsText: string;
  step: IntakeStep;
  selectedCategory: string;
  selectedSubcategory: string;
  selectedCity: string;
  selectedNeighborhood: string;
  resolvedNeighborhoodSlug: string | null;
  intakeAnalyzeCityHint: { cityName?: string; citySlug?: string };
  sortedCities: City[];
  buildParsedFromForm: () => ParsedIntent;
  setStep: (step: IntakeStep) => void;
  setError: (msg: string | null) => void;
  setSelectedCategory: (v: string) => void;
  setSelectedSubcategory: (v: string) => void;
  setNeedDraft: (draft: NeedDraft) => void;
  syncNeedDraftFromFormFields: (fields: {
    needText: string;
    detailsText: string;
    categorySlug: string;
    subcategorySlug: string;
    city: string;
    neighborhood: string;
    neighborhoodSlug?: string | null;
  }) => NeedDraft | null;
  setNeedDraftFromAnalysis: (
    analysis: IntakeAnalysisResult,
    sourceText: string,
    intakeTrace?: IntakeAnalysisTrace
  ) => void;
  getDraft: () => NeedDraft | null;
  patchNeedDraftEntities: (patch: Record<string, unknown>) => void;
  applyDetectedLocationFromDraft: (draft: NeedDraft) => void;
  computeEnabledSectionsForLocation: (draft: NeedDraft) => Set<string>;
  setEnabledSections: (s: Set<string>) => void;
  setAiShardStatus: (s: Partial<Record<IntakeAiShardKey, IntakeAiShardStatus>>) => void;
  setAiEnriching: (v: boolean) => void;
  cityLockedByUserRef: MutableRefObject<boolean>;
  neighborhoodLockedByUserRef: MutableRefObject<boolean>;
  categoryLockedByUserRef: MutableRefObject<boolean>;
  resolveIntakeCitySelectValue: (
    managedCities: City[],
    opts: { cityName?: string | null; citySlug?: string | null; cityId?: string | null }
  ) => string | null;
}

/** Debounced analyze on location step + goToLocation enrichment. */
export function useIntakeAnalyze(opts: UseIntakeAnalyzeOptions) {
  const enrichGenRef = useRef(0);
  const locationAnalyzeKeyRef = useRef<string | null>(null);

  const applyEnrichedAnalysis = useCallback(
    (
      analysis: Awaited<ReturnType<typeof analyzeIntakeTextApi>>,
      combined: string,
      parsed: ParsedIntent
    ) => {
      opts.setNeedDraftFromAnalysis(analysis, combined, analysis.meta?.trace);

      const engineCategory =
        analysis.entities.subcategorySlug ??
        analysis.entities.categorySlug ??
        parsed.categorySlug;
      const engineNormalized = engineCategory ? normalizeCategoryPair(engineCategory) : null;
      if (engineNormalized && !opts.categoryLockedByUserRef.current) {
        opts.setSelectedCategory(engineNormalized.categorySlug);
        opts.setSelectedSubcategory(engineNormalized.subcategorySlug ?? '');
      }

      const enrichedDraft = opts.getDraft();
      if (enrichedDraft) {
        if (opts.cityLockedByUserRef.current || opts.neighborhoodLockedByUserRef.current) {
          const patch: Record<string, unknown> = {};
          if (opts.cityLockedByUserRef.current && opts.selectedCity.trim()) {
            patch.city = opts.selectedCity.trim();
          }
          if (opts.neighborhoodLockedByUserRef.current) {
            patch.neighborhood = opts.selectedNeighborhood.trim() || null;
          }
          if (Object.keys(patch).length > 0) {
            opts.patchNeedDraftEntities(patch);
          }
        } else {
          opts.applyDetectedLocationFromDraft(enrichedDraft);
        }
        if (enrichedDraft.sections?.length) {
          opts.setEnabledSections(opts.computeEnabledSectionsForLocation(enrichedDraft));
        }
        opts.setAiShardStatus(shardStatusFromNeedDraft(opts.getDraft(), false));
      }
    },
    [
      opts.setNeedDraftFromAnalysis,
      opts.getDraft,
      opts.patchNeedDraftEntities,
      opts.selectedCity,
      opts.selectedNeighborhood,
      opts.applyDetectedLocationFromDraft,
      opts.computeEnabledSectionsForLocation,
      opts.setEnabledSections,
      opts.setAiShardStatus,
      opts.setSelectedCategory,
      opts.setSelectedSubcategory,
      opts.categoryLockedByUserRef,
      opts.cityLockedByUserRef,
      opts.neighborhoodLockedByUserRef,
    ]
  );

  const goToLocation = useCallback(() => {
    if (!canProceedToIntakeLocation(opts.needText, opts.detailsText)) {
      toast.info('توضیحات را وارد کنید یا در مرحله قبل متن کامل‌تری بنویسید');
      return;
    }

    const combined = composeIntakeSourceText(opts.needText, opts.detailsText);
    opts.setError(null);

    const parsed = opts.buildParsedFromForm();
    const categorySlug = parsed.categorySlug;
    const normalized = categorySlug ? normalizeCategoryPair(categorySlug) : null;
    if (normalized) {
      opts.setSelectedCategory(normalized.categorySlug);
      opts.setSelectedSubcategory(normalized.subcategorySlug ?? '');
    } else {
      opts.setSelectedCategory(parsed.categorySlug);
      opts.setSelectedSubcategory(parsed.subcategorySlug ?? '');
    }

    const instantDraft = opts.syncNeedDraftFromFormFields({
      needText: opts.needText,
      detailsText: opts.detailsText,
      categorySlug: normalized?.categorySlug ?? opts.selectedCategory,
      subcategorySlug: normalized?.subcategorySlug ?? opts.selectedSubcategory,
      city:
        opts.resolveIntakeCitySelectValue(opts.sortedCities, {
          cityName: opts.selectedCity || parsed.city,
        }) ?? '',
      neighborhood: opts.selectedNeighborhood || parsed.entities?.area || '',
      neighborhoodSlug: opts.resolvedNeighborhoodSlug,
    });

    if (instantDraft) {
      opts.setNeedDraft(recomputeNeedDraft(instantDraft));
      if (!opts.cityLockedByUserRef.current && !opts.neighborhoodLockedByUserRef.current) {
        opts.applyDetectedLocationFromDraft(instantDraft);
      }
      if (instantDraft.sections?.length) {
        opts.setEnabledSections(opts.computeEnabledSectionsForLocation(instantDraft));
      }
      opts.setAiShardStatus(shardStatusFromNeedDraft(instantDraft, true));
    } else {
      opts.setAiShardStatus({
        category: 'running',
        need: 'running',
        city: 'running',
        neighborhood: 'running',
        budget: 'running',
      });
    }

    opts.setStep('location');

    locationAnalyzeKeyRef.current = [
      combined,
      normalized?.categorySlug ?? opts.selectedCategory,
      normalized?.subcategorySlug ?? opts.selectedSubcategory,
      opts.selectedCity,
    ].join('\0');

    const runId = ++enrichGenRef.current;
    opts.setAiEnriching(true);

    void (async () => {
      try {
        const analysis = await analyzeIntakeTextApi(combined, opts.intakeAnalyzeCityHint);
        if (enrichGenRef.current !== runId) return;
        applyEnrichedAnalysis(analysis, combined, parsed);
      } catch (err) {
        if (enrichGenRef.current !== runId) return;
        opts.setAiShardStatus(shardStatusFromNeedDraft(opts.getDraft(), false));
        const msg = err instanceof Error ? err.message : 'تحلیل هوشمند انجام نشد';
        toast.error(`${msg} — می‌توانید دستی تکمیل کنید`);
      } finally {
        if (enrichGenRef.current === runId) {
          opts.setAiEnriching(false);
        }
      }
    })();
  }, [
    applyEnrichedAnalysis,
    opts.needText,
    opts.detailsText,
    opts.selectedCategory,
    opts.selectedSubcategory,
    opts.selectedCity,
    opts.selectedNeighborhood,
    opts.resolvedNeighborhoodSlug,
    opts.intakeAnalyzeCityHint,
    opts.sortedCities,
    opts.buildParsedFromForm,
    opts.setError,
    opts.setSelectedCategory,
    opts.setSelectedSubcategory,
    opts.syncNeedDraftFromFormFields,
    opts.setNeedDraft,
    opts.applyDetectedLocationFromDraft,
    opts.computeEnabledSectionsForLocation,
    opts.setEnabledSections,
    opts.setAiShardStatus,
    opts.setStep,
    opts.setAiEnriching,
    opts.getDraft,
    opts.resolveIntakeCitySelectValue,
    opts.cityLockedByUserRef,
    opts.neighborhoodLockedByUserRef,
  ]);

  const buildLocationAnalyzeKey = useCallback(
    () =>
      [
        composeIntakeSourceText(opts.needText, opts.detailsText),
        opts.selectedCategory,
        opts.selectedSubcategory,
        opts.selectedCity,
      ].join('\0'),
    [opts.needText, opts.detailsText, opts.selectedCategory, opts.selectedSubcategory, opts.selectedCity]
  );

  useEffect(() => {
    if (opts.step !== 'location') {
      locationAnalyzeKeyRef.current = null;
    }
  }, [opts.step]);

  useEffect(() => {
    if (opts.step !== 'location') return;
    if (!canProceedToIntakeLocation(opts.needText, opts.detailsText)) return;

    const key = buildLocationAnalyzeKey();
    if (locationAnalyzeKeyRef.current === null) {
      locationAnalyzeKeyRef.current = key;
      return;
    }
    if (locationAnalyzeKeyRef.current === key) return;

    const timer = window.setTimeout(() => {
      locationAnalyzeKeyRef.current = key;
      const combined = composeIntakeSourceText(opts.needText, opts.detailsText);
      const parsed = opts.buildParsedFromForm();
      const runId = ++enrichGenRef.current;
      opts.setAiEnriching(true);
      void (async () => {
        try {
          const analysis = await analyzeIntakeTextApi(combined, opts.intakeAnalyzeCityHint);
          if (enrichGenRef.current !== runId) return;
          applyEnrichedAnalysis(analysis, combined, parsed);
        } catch {
          if (enrichGenRef.current !== runId) return;
          opts.setAiShardStatus(shardStatusFromNeedDraft(opts.getDraft(), false));
        } finally {
          if (enrichGenRef.current === runId) opts.setAiEnriching(false);
        }
      })();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [
    opts.step,
    opts.needText,
    opts.detailsText,
    buildLocationAnalyzeKey,
    applyEnrichedAnalysis,
    opts.intakeAnalyzeCityHint,
    opts.getDraft,
    opts.buildParsedFromForm,
    opts.setAiEnriching,
    opts.setAiShardStatus,
  ]);

  return { goToLocation, applyEnrichedAnalysis };
}
