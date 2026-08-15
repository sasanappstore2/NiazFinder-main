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
import { COMPOSE_AUTO_APPLY_MIN_CONFIDENCE, mayAutoApplyLocation, mayPrefillNeighborhood, sanitizeDraftForComposeAutoApply } from '@/lib/need-intake/compose-auto-apply';
import { normalizeCategoryPair } from '@/config/categories';
import { recomputeNeedDraft, recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import type { IntakeAiShardKey, IntakeAiShardStatus } from '@/components/need-intake/IntakeAiShardBar';
import { cascadeRunningShardsFromDraft, shardStatusFromNeedDraft } from '@/components/need-intake/intake-shard-status';
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
    intakeTrace?: IntakeAnalysisTrace,
    locks?: {
      categoryLockedByUser?: boolean;
      cityLockedByUser?: boolean;
      neighborhoodLockedByUser?: boolean;
      dealLockedByUser?: boolean;
      lockedFieldKeys?: string[];
    }
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

function locationProceedOpts(opts: UseIntakeAnalyzeOptions) {
  const draft = opts.getDraft();
  const entities = draft ? recordToEntities(draft.entities) : null;
  return {
    hasCategory: Boolean(
      opts.selectedCategory ||
        opts.selectedSubcategory ||
        entities?.categorySlug ||
        entities?.subcategorySlug ||
        draft?.parsedIntent?.categorySlug
    ),
    hasCity: Boolean(
      opts.selectedCity ||
        entities?.city ||
        draft?.parsedIntent?.city
    ),
  };
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
  const categoryConfidence = Math.max(
    Number(draft.fieldMeta?.subcategorySlug?.confidence ?? 0),
    Number(draft.fieldMeta?.categorySlug?.confidence ?? 0)
  );
  const canWriteCategory =
    Boolean(leaf) &&
    !ambiguousCommercial &&
    (categoryLocked || categoryConfidence >= COMPOSE_AUTO_APPLY_MIN_CONFIDENCE);

  if (canWriteCategory && leaf) {
    const normalized = normalizeCategoryPair(leaf);
    opts.setSelectedCategory(normalized.categorySlug);
    opts.setSelectedSubcategory(normalized.subcategorySlug ?? '');
  }

  const allowCity = opts.cityLockedByUserRef.current || mayAutoApplyLocation(draft, 'city');
  const allowNeighborhood =
    opts.neighborhoodLockedByUserRef.current || mayPrefillNeighborhood(draft);
  if (allowCity || allowNeighborhood) {
    opts.applyDetectedLocationFromDraft(draft);
  }

  if (draft.sections?.length) {
    opts.setEnabledSections(opts.computeEnabledSectionsForLocation(draft));
  }
}

function fallbackGoToLocation(opts: UseIntakeAnalyzeOptions): NeedDraft | null {
  const parsed = opts.buildParsedFromForm();
  const sourceText = composeIntakeSourceText(opts.needText, opts.detailsText);
  const categoryLocked = opts.categoryLockedByUserRef.current;
  const neighborhoodLocked = opts.neighborhoodLockedByUserRef.current;

  const normalized = parsed.categorySlug ? normalizeCategoryPair(parsed.categorySlug) : null;
  const ambiguousCommercial = isAmbiguousCommercialSubtype(sourceText);
  // Only keep user-locked category; do not auto-select from parse.
  if (normalized && categoryLocked && !ambiguousCommercial) {
    opts.setSelectedCategory(normalized.categorySlug);
    opts.setSelectedSubcategory(normalized.subcategorySlug ?? '');
  }

  const neighborhood = neighborhoodLocked
    ? opts.selectedNeighborhood
    : opts.selectedNeighborhood || '';

  const instantDraft = opts.syncNeedDraftFromFormFields(
    {
      needText: opts.needText,
      detailsText: opts.detailsText,
      categorySlug: categoryLocked
        ? normalized?.categorySlug ?? opts.selectedCategory
        : opts.selectedCategory || '',
      subcategorySlug: categoryLocked
        ? normalized?.subcategorySlug ?? opts.selectedSubcategory
        : opts.selectedSubcategory || '',
      city: opts.cityLockedByUserRef.current
        ? opts.resolveIntakeCitySelectValue(opts.sortedCities, {
            cityName: opts.selectedCity || parsed.city,
          }) ?? opts.selectedCity
        : opts.selectedCity || '',
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
  const analyzedDraft = (res as { draft?: NeedDraft }).draft;
  const next = analyzedDraft
    ? sanitizeDraftForComposeAutoApply(analyzedDraft)
    : opts.getDraft();
  if (next) {
    opts.setNeedDraft(next);
    applyDraftToFormFields(next, opts, sourceText);
    opts.setAiShardStatus(shardStatusFromNeedDraft(next, false, progressOpts(opts)));
  } else {
    opts.setAiShardStatus({});
  }
  opts.setAiEnriching(false);
  void sourceText;
}

/** Navigate to location instantly; full analyze runs in background when needed. */
export function useIntakeAnalyze(opts: UseIntakeAnalyzeOptions) {
  const goToLocation = useCallback(() => {
    if (!canProceedToIntakeLocation(opts.needText, opts.detailsText, locationProceedOpts(opts))) {
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
    if (!canProceedToIntakeLocation(opts.needText, opts.detailsText, locationProceedOpts(opts))) return;
    void opts.analyzeNow();
  }, [opts]);

  return { goToLocation, prefetchLocationAnalyze };
}
