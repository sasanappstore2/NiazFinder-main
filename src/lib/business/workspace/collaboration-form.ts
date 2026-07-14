import type {
  CollaborationAreaBand,
  CollaborationBudgetBand,
  CollaborationPropertyKind,
  CollaborationSubjectKind,
} from '@prisma/client';
import {
  createStructuredCollaborationPostSchema,
  type CollaborationDealType,
  type CollaborationTargetArea,
  type CreateStructuredCollaborationPostInput,
  isRentDealType,
} from './collaboration-posts';

export const COLLABORATION_WIZARD_STEPS = [
  { id: 1 as const, title: 'نوع همکاری', hint: 'چه چیزی برای همکاری دارید؟' },
  { id: 2 as const, title: 'ملک و معامله', hint: 'نوع معامله و ملک را مشخص کنید' },
  { id: 3 as const, title: 'محدوده نمایش', hint: 'کجا به همکاران نشان داده شود؟' },
] as const;

export type CollaborationWizardStepId = (typeof COLLABORATION_WIZARD_STEPS)[number]['id'];

export type CollaborationFormDraft = {
  subjectKind: CollaborationSubjectKind;
  dealType: CollaborationDealType;
  propertyKind: CollaborationPropertyKind;
  areaBand: CollaborationAreaBand | null;
  budgetBand: CollaborationBudgetBand | null;
  cityId: string;
  targetAreas: CollaborationTargetArea[];
};

export const INITIAL_COLLABORATION_FORM: CollaborationFormDraft = {
  subjectKind: 'CLIENT',
  dealType: 'sell',
  propertyKind: 'APARTMENT',
  areaBand: null,
  budgetBand: null,
  cityId: '',
  targetAreas: [],
};

export const MAX_COLLABORATION_NEIGHBORHOODS = 3;

export function sanitizeBudgetBandForDeal(
  dealType: CollaborationDealType,
  budgetBand: CollaborationBudgetBand | null
): CollaborationBudgetBand | null {
  if (!budgetBand) return null;
  const rent = isRentDealType(dealType);
  const isRentBand = budgetBand.startsWith('RENT_');
  return rent === isRentBand ? budgetBand : null;
}

export function buildCollaborationSubmitPayload(
  draft: CollaborationFormDraft
): CreateStructuredCollaborationPostInput {
  return {
    subjectKind: draft.subjectKind,
    dealType: draft.dealType,
    propertyKind: draft.propertyKind,
    areaBand: draft.areaBand,
    budgetBand: sanitizeBudgetBandForDeal(draft.dealType, draft.budgetBand),
    targetAreas: draft.targetAreas,
  };
}

export function validateCollaborationDraft(draft: CollaborationFormDraft) {
  return createStructuredCollaborationPostSchema.safeParse(buildCollaborationSubmitPayload(draft));
}

export function canAdvanceCollaborationStep(
  step: CollaborationWizardStepId,
  draft: CollaborationFormDraft
): boolean {
  switch (step) {
    case 1:
      return Boolean(draft.subjectKind);
    case 2:
      return Boolean(draft.dealType && draft.propertyKind);
    case 3:
      return draft.targetAreas.length > 0;
    default:
      return false;
  }
}

export function formatCollaborationTargetAreaLabel(areas: CollaborationTargetArea[]): string | null {
  if (!areas.length) return null;
  const city = areas[0]?.city;
  const hoods = areas.map((a) => a.neighborhood).join(' / ');
  return city ? `${city} · ${hoods}` : hoods;
}
