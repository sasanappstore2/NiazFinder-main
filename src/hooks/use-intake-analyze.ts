'use client';

import { useCallback, type MutableRefObject } from 'react';
import { toast } from 'sonner';
import type { ParsedIntent, NeedDraft, IntakeStep } from '@/contracts/need-intake';
import type { City } from '@/lib/location-system';
import {
  canProceedToIntakeLocation,
  composeIntakeSourceText,
} from '@/lib/need-intake/compose-source-text';
import { normalizeCategoryPair } from '@/config/categories';
import { recomputeNeedDraft } from '@/intake/aggregate/needDraftAggregate';
import type { IntakeAiShardKey, IntakeAiShardStatus } from '@/components/need-intake/IntakeAiShardBar';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';

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
  // Legacy options kept for call-site compatibility (unused).
  setNeedDraftFromAnalysis?: unknown;
}

/** Manual navigation to location step — no analyze API. */
export function useIntakeAnalyze(opts: UseIntakeAnalyzeOptions) {
  const goToLocation = useCallback(() => {
    if (!canProceedToIntakeLocation(opts.needText, opts.detailsText)) {
      toast.info('توضیحات را وارد کنید یا در مرحله قبل متن کامل‌تری بنویسید');
      return;
    }

    opts.setError(null);

    const parsed = opts.buildParsedFromForm();
    const sourceText = composeIntakeSourceText(opts.needText, opts.detailsText);
    const fragment = extractLocationFragment(sourceText)?.trim() ?? '';
    const parsedNeighborhood = parsed.entities?.area?.trim() || fragment;
    const categoryLocked = opts.categoryLockedByUserRef.current;
    const neighborhoodLocked = opts.neighborhoodLockedByUserRef.current;

    const normalized = parsed.categorySlug ? normalizeCategoryPair(parsed.categorySlug) : null;
    if (normalized && !categoryLocked) {
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
          : normalized?.categorySlug ?? '',
        subcategorySlug: categoryLocked
          ? normalized?.subcategorySlug ?? opts.selectedSubcategory
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

    if (instantDraft) {
      const draft = recomputeNeedDraft(instantDraft);
      opts.setNeedDraft(draft);
      if (!opts.cityLockedByUserRef.current && !neighborhoodLocked) {
        opts.applyDetectedLocationFromDraft(draft);
      }
      if (draft.sections?.length) {
        opts.setEnabledSections(opts.computeEnabledSectionsForLocation(draft));
      }
    }

    opts.setAiShardStatus({});
    opts.setAiEnriching(false);
    opts.setStep('location');
  }, [opts]);

  return { goToLocation };
}
