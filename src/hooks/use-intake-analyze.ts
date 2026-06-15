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
    const categorySlug = parsed.categorySlug;
    const normalized = categorySlug ? normalizeCategoryPair(categorySlug) : null;
    if (normalized) {
      opts.setSelectedCategory(normalized.categorySlug);
      opts.setSelectedSubcategory(normalized.subcategorySlug ?? '');
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
      const draft = recomputeNeedDraft(instantDraft);
      opts.setNeedDraft(draft);
      if (!opts.cityLockedByUserRef.current && !opts.neighborhoodLockedByUserRef.current) {
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
