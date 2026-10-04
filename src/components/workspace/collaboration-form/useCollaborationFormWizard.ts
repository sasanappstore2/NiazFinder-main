'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { toast } from 'sonner';
import { getClientAuthJsonHeaders } from '@/lib/auth/client-auth';
import {
  buildCollaborationHeadline,
  type CollaborationDealType,
  type CollaborationTargetArea,
} from '@/lib/business/workspace/collaboration-posts';
import {
  canAdvanceCollaborationStep,
  COLLABORATION_WIZARD_STEPS,
  INITIAL_COLLABORATION_FORM,
  MAX_COLLABORATION_NEIGHBORHOODS,
  sanitizeBudgetBandForDeal,
  validateCollaborationDraft,
  type CollaborationFormDraft,
  type CollaborationWizardStepId,
} from '@/lib/business/workspace/collaboration-form';
import type {
  CollaborationAreaBand,
  CollaborationBudgetBand,
  CollaborationPropertyKind,
  CollaborationSubjectKind,
} from '@prisma/client';
import type { City } from '@/lib/location-system';

type WizardAction =
  | { type: 'reset' }
  | { type: 'patch'; patch: Partial<CollaborationFormDraft> }
  | { type: 'set_city'; cityId: string }
  | { type: 'set_target_areas'; areas: CollaborationTargetArea[] };

function wizardReducer(state: CollaborationFormDraft, action: WizardAction): CollaborationFormDraft {
  switch (action.type) {
    case 'reset':
      return { ...INITIAL_COLLABORATION_FORM };
    case 'patch': {
      const next = { ...state, ...action.patch };
      if (action.patch.dealType) {
        next.budgetBand = sanitizeBudgetBandForDeal(action.patch.dealType, next.budgetBand);
      }
      return next;
    }
    case 'set_city':
      return { ...state, cityId: action.cityId, targetAreas: [] };
    case 'set_target_areas':
      return { ...state, targetAreas: action.areas.slice(0, MAX_COLLABORATION_NEIGHBORHOODS) };
    default:
      return state;
  }
}

function resolveDefaultCityId(cities: City[], businessCity?: string): string {
  const trimmed = businessCity?.trim();
  if (!trimmed) return cities[0]?.id ?? '';
  return (
    cities.find((c) => c.name === trimmed)?.id ??
    cities.find((c) => c.name.includes(trimmed))?.id ??
    cities[0]?.id ??
    ''
  );
}

export function useCollaborationFormWizard({
  open,
  businessCity,
  cities,
}: {
  open: boolean;
  businessCity?: string;
  cities: City[];
}) {
  const [draft, dispatch] = useReducer(wizardReducer, INITIAL_COLLABORATION_FORM);
  const [step, setStep] = useState<CollaborationWizardStepId>(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      dispatch({ type: 'reset' });
      setStep(1);
      return;
    }
    const cityId = resolveDefaultCityId(cities, businessCity);
    if (cityId) {
      dispatch({ type: 'patch', patch: { cityId } });
    }
  }, [open, cities, businessCity]);

  const stepMeta = COLLABORATION_WIZARD_STEPS[step - 1]!;
  const canAdvance = canAdvanceCollaborationStep(step, draft);
  const isLastStep = step === COLLABORATION_WIZARD_STEPS.length;

  const previewHeadline = useMemo(() => {
    if (!draft.targetAreas.length) return '';
    return buildCollaborationHeadline({
      subjectKind: draft.subjectKind,
      dealType: draft.dealType,
      propertyKind: draft.propertyKind,
      areaBand: draft.areaBand,
      budgetBand: sanitizeBudgetBandForDeal(draft.dealType, draft.budgetBand),
      targetAreas: draft.targetAreas,
    });
  }, [draft]);

  const setSubjectKind = useCallback((subjectKind: CollaborationSubjectKind) => {
    dispatch({ type: 'patch', patch: { subjectKind } });
  }, []);

  const setDealType = useCallback((dealType: CollaborationDealType) => {
    dispatch({ type: 'patch', patch: { dealType } });
  }, []);

  const setPropertyKind = useCallback((propertyKind: CollaborationPropertyKind) => {
    dispatch({ type: 'patch', patch: { propertyKind } });
  }, []);

  const setAreaBand = useCallback((areaBand: CollaborationAreaBand | null) => {
    dispatch({ type: 'patch', patch: { areaBand } });
  }, []);

  const setBudgetBand = useCallback((budgetBand: CollaborationBudgetBand | null) => {
    dispatch({ type: 'patch', patch: { budgetBand } });
  }, []);

  const setCityId = useCallback((cityId: string) => {
    dispatch({ type: 'set_city', cityId });
  }, []);

  const setTargetAreas = useCallback((areas: CollaborationTargetArea[]) => {
    dispatch({ type: 'set_target_areas', areas });
  }, []);

  const goNext = useCallback(() => {
    if (!canAdvance) return;
    if (isLastStep) return;
    setStep((step + 1) as CollaborationWizardStepId);
  }, [canAdvance, isLastStep, step]);

  const goBack = useCallback(() => {
    if (step <= 1) return;
    setStep((step - 1) as CollaborationWizardStepId);
  }, [step]);

  const submit = useCallback(async () => {
    const parsed = validateCollaborationDraft(draft);
    if (!parsed.success) {
      toast.error('اطلاعات ناقص یا نامعتبر است');
      return false;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/business/me/workspace-collaborations', {
        method: 'POST',
        headers: getClientAuthJsonHeaders(),
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((body as { error?: string }).error ?? 'ثبت همکاری ناموفق بود');
        return false;
      }
      toast.success('درخواست همکاری منتشر شد');
      return true;
    } catch {
      toast.error('خطا در ارتباط با سرور');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [draft]);

  return {
    draft,
    step,
    stepMeta,
    canAdvance,
    isLastStep,
    submitting,
    previewHeadline,
    setSubjectKind,
    setDealType,
    setPropertyKind,
    setAreaBand,
    setBudgetBand,
    setCityId,
    setTargetAreas,
    goNext,
    goBack,
    submit,
  };
}
