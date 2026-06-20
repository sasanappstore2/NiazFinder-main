'use client';

import { useCallback, type MutableRefObject } from 'react';
import { toast } from 'sonner';
import type { ParsedIntent, NeedDraft, IntakeStep } from '@/contracts/need-intake';
import type { IntakeAnalyzeResponse } from '@/intake/api/intake.dto';
import type { IntakeAnalysisResult } from '@/intake/types';
import type { IntakeAnalysisTrace } from '@/intake/types/analysis-trace';
import type { City } from '@/lib/location-system';
import {
  canProceedToIntakeLocation,
  composeIntakeSourceText,
} from '@/lib/need-intake/compose-source-text';
import { normalizeCategoryPair } from '@/config/categories';
import { recomputeNeedDraft, recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import type { IntakeAiShardKey, IntakeAiShardStatus } from '@/components/need-intake/IntakeAiShardBar';
import { cascadeRunningShardsFromDraft, shardStatusFromNeedDraft } from '@/components/need-intake/intake-shard-status';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import { isAmbiguousCommercialSubtype } from '@/lib/need-intake/business-commercial-property-intent';

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
  setSelectedNeighborhood: (v: string) => void;
  setNeedDraft: (draft: NeedDraft) => void;
  syncNeedDraftFromFormFields: (
    fields: {
      needText: string;
      detailsText: string;
      categorySlug: string;
      subcategorySlug: string;
      city: string;
      neighborhood: string;
      neighborhoodSlug?: string | null;
    },
    opts?: { categoryLockedByUser?: boolean }
  ) => NeedDraft | null;
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
  setNeedDraftFromAnalysis: (
    analysis: IntakeAnalysisResult,
    sourceText: string,
    intakeTrace?: IntakeAnalysisTrace
  ) => void;
  /** Live intelligence cache — skip blocking API when fresh. */
  isFreshForText: (sourceText: string) => boolean;
  analyzing: boolean;
  analyzeNow: () => Promise<IntakeAnalyzeResponse | null>;
  waitForAnalysis: () => Promise<IntakeAnalyzeResponse | null>;
}

function progressOpts(opts: UseIntakeAnalyzeOptions) {
  return { needText: opts.needText, detailsText: opts.detailsText };
}

function applyDraftToFormFields(
  draft: NeedDraft,
  opts: UseIntakeAnalyzeOptions,
  sourceText: string
): void {
  const categoryLocked = opts.categoryLockedByUserRef.current;
  const ambiguousCommercial = isAmbiguousCommercialSubtype(sourceText);
  const entities = recordToEntities(draft.entities);
  const leaf = entities.subcategorySlug || entities.categorySlug;

  if (leaf && !categoryLocked && !ambiguousCommercial) {
    const normalized = normalizeCategoryPair(leaf);
    opts.setSelectedCategory(normalized.categorySlug);
    opts.setSelectedSubcategory(normalized.subcategorySlug ?? '');
  }

  if (!opts.cityLockedByUserRef.current || !opts.neighborhoodLockedByUserRef.current) {
    opts.applyDetectedLocationFromDraft(draft);
  }

  if (draft.sections?.length) {
    opts.setEnabledSections(opts.computeEnabledSectionsForLocation(draft));
  }
}

function fallbackGoToLocation(opts: UseIntakeAnalyzeOptions): NeedDraft | null {
  const parsed = opts.buildParsedFromForm();
  const sourceText = composeIntakeSourceText(opts.needText, opts.detailsText);
  const fragment = extractLocationFragment(sourceText)?.trim() ?? '';
  const parsedNeighborhood = parsed.entities?.area?.trim() || fragment;
  const categoryLocked = opts.categoryLockedByUserRef.current;
  const neighborhoodLocked = opts.neighborhoodLockedByUserRef.current;

  const normalized = parsed.categorySlug ? normalizeCategoryPair(parsed.categorySlug) : null;
  const ambiguousCommercial = isAmbiguousCommercialSubtype(sourceText);
  if (normalized && !categoryLocked && !ambiguousCommercial) {
    opts.setSelectedCategory(normalized.categorySlug);
    opts.setSelectedSubcategory(normalized.subcategorySlug ?? '');
  }

  const neighborhood = neighborhoodLocked
    ? opts.selectedNeighborhood
    : parsedNeighborhood || opts.selectedNeighborhood;

  if (!neighborhoodLocked && neighborhood && neighborhood !== opts.selectedNeighborhood) {
    opts.setSelectedNeighborhood(neighborhood);
  }

  const instantDraft = opts.syncNeedDraftFromFormFields(
    {
      needText: opts.needText,
      detailsText: opts.detailsText,
      categorySlug: categoryLocked
        ? normalized?.categorySlug ?? opts.selectedCategory
        : ambiguousCommercial
          ? ''
          : normalized?.categorySlug ?? '',
      subcategorySlug: categoryLocked
        ? normalized?.subcategorySlug ?? opts.selectedSubcategory
        : ambiguousCommercial
          ? ''
          : normalized?.subcategorySlug ?? '',
      city:
        opts.resolveIntakeCitySelectValue(opts.sortedCities, {
          cityName: opts.selectedCity || parsed.city,
        }) ?? '',
      neighborhood,
      neighborhoodSlug: opts.resolvedNeighborhoodSlug,
    },
    { categoryLockedByUser: categoryLocked }
  );

  if (!instantDraft) return null;

  const draft = recomputeNeedDraft(instantDraft);
  opts.setNeedDraft(draft);
  applyDraftToFormFields(draft, opts, sourceText);
  return draft;
}

function finishFromAnalysis(
  res: IntakeAnalyzeResponse | null,
  opts: UseIntakeAnalyzeOptions,
  sourceText: string
): void {
  if (!res) return;
  opts.setNeedDraftFromAnalysis(res, sourceText, res.meta?.trace);
  const draft = opts.getDraft();
  if (draft) {
    applyDraftToFormFields(draft, opts, sourceText);
    opts.setAiShardStatus(shardStatusFromNeedDraft(draft, false, progressOpts(opts)));
  } else {
    opts.setAiShardStatus({});
  }
  opts.setAiEnriching(false);
}

/** Navigate to location instantly; full analyze runs in background when needed. */
export function useIntakeAnalyze(opts: UseIntakeAnalyzeOptions) {
  const goToLocation = useCallback(() => {
    if (!canProceedToIntakeLocation(opts.needText, opts.detailsText)) {
      toast.info('توضیحات را وارد کنید یا در مرحله قبل متن کامل\u200cتری بنویسید');
      return;
    }

    opts.setError(null);
    const sourceText = composeIntakeSourceText(opts.needText, opts.detailsText);
    const cachedDraft = opts.getDraft();
    const cacheFresh = opts.isFreshForText(sourceText) && cachedDraft;

    if (cacheFresh) {
      applyDraftToFormFields(cachedDraft, opts, sourceText);
      opts.setAiShardStatus(
        shardStatusFromNeedDraft(cachedDraft, opts.analyzing, progressOpts(opts))
      );
      opts.setStep('location');
      if (opts.analyzing) {
        opts.setAiEnriching(true);
        void opts.waitForAnalysis().then((res) => finishFromAnalysis(res, opts, sourceText));
      }
      return;
    }

    const instantDraft = fallbackGoToLocation(opts);
    opts.setAiShardStatus(
      cascadeRunningShardsFromDraft(instantDraft, true, progressOpts(opts))
    );
    opts.setAiEnriching(true);
    opts.setStep('location');

    void (async () => {
      try {
        const res = opts.analyzing
          ? await opts.waitForAnalysis()
          : await opts.analyzeNow();
        finishFromAnalysis(res, opts, sourceText);
      } catch {
        opts.setAiShardStatus(
          shardStatusFromNeedDraft(opts.getDraft(), false, progressOpts(opts))
        );
        opts.setAiEnriching(false);
        toast.info('تحلیل کامل نشد — فرم با اطلاعات فعلی باز شد');
      }
    })();
  }, [opts]);

  const prefetchLocationAnalyze = useCallback(() => {
    if (!canProceedToIntakeLocation(opts.needText, opts.detailsText)) return;
    void opts.analyzeNow();
  }, [opts]);

  return { goToLocation, prefetchLocationAnalyze };
}
