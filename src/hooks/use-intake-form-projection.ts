'use client';

import { useMemo } from 'react';
import type { IntakeStep, NeedDraft } from '@/contracts/need-intake';

export interface IntakeFormProjectionFields {
  needText: string;
  detailsText: string;
  categorySlug: string;
  subcategorySlug: string;
  city: string;
  neighborhood: string;
  neighborhoodSlug: string | null;
}

export interface UseIntakeFormProjectionOptions {
  needText: string;
  detailsText: string;
  selectedCategory: string;
  selectedSubcategory: string;
  selectedCity: string;
  selectedNeighborhood: string;
  resolvedNeighborhoodSlug: string | null;
  step: IntakeStep;
  projectNeedDraftFromFormFields: (
    fields: IntakeFormProjectionFields
  ) => NeedDraft | null;
}

/** Live draft projection from form fields (same path as /post sidebar). */
export function useIntakeFormProjection({
  needText,
  detailsText,
  selectedCategory,
  selectedSubcategory,
  selectedCity,
  selectedNeighborhood,
  resolvedNeighborhoodSlug,
  step,
  projectNeedDraftFromFormFields,
}: UseIntakeFormProjectionOptions) {
  const intakeFormProjection = useMemo(
    (): IntakeFormProjectionFields => ({
      needText,
      detailsText,
      categorySlug: selectedCategory,
      subcategorySlug: selectedSubcategory,
      city: selectedCity,
      neighborhood: selectedNeighborhood,
      neighborhoodSlug: resolvedNeighborhoodSlug,
    }),
    [
      needText,
      detailsText,
      selectedCategory,
      selectedSubcategory,
      selectedCity,
      selectedNeighborhood,
      resolvedNeighborhoodSlug,
    ]
  );

  const projectedDraft = useMemo(() => {
    if (!needText.trim()) return null;
    return projectNeedDraftFromFormFields(intakeFormProjection);
  }, [needText, projectNeedDraftFromFormFields, intakeFormProjection]);

  const liveDraftForCopy = useMemo(() => {
    if (step !== 'location' && step !== 'details') return null;
    if (!projectedDraft) return null;
    if (step === 'location' && !selectedCity.trim()) return null;
    return projectedDraft;
  }, [step, projectedDraft, selectedCity]);

  const liveCopyStreamEnabled =
    Boolean(needText.trim()) &&
    (step === 'details' ||
      (step === 'location' &&
        Boolean(
          selectedCity.trim() && (selectedCategory.trim() || selectedSubcategory.trim())
        )));

  return {
    intakeFormProjection,
    projectedDraft,
    liveDraftForCopy,
    liveCopyStreamEnabled,
  };
}
