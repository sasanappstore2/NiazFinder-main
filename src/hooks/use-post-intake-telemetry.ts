'use client';

import { useEffect, useRef } from 'react';
import type { IntakeStep, NeedDraft } from '@/contracts/need-intake';
import {
  flushPostIntakeTelemetry,
  setPostIntakeTelemetryContext,
  trackDropoff,
  trackStepChange,
  type PostIntakeWizardStep,
} from '@/intake/telemetry/postIntakeTelemetry';

function toTelemetryStep(step: IntakeStep): PostIntakeWizardStep {
  if (step === 'compose' || step === 'need' || step === 'details') return 'compose';
  if (
    step === 'location' ||
    step === 'preview' ||
    step === 'publishing' ||
    step === 'done'
  ) {
    return step;
  }
  return 'compose';
}

export interface UsePostIntakeTelemetryOptions {
  step: IntakeStep;
  templateId: string;
  categorySlug?: string | null;
  needDraft: NeedDraft | null;
}

/**
 * Binds /post wizard lifecycle to post-intake telemetry (step transitions + drop-off).
 * Does not alter wizard state — observation only.
 */
export function usePostIntakeTelemetry({
  step,
  templateId,
  categorySlug,
  needDraft,
}: UsePostIntakeTelemetryOptions): void {
  const prevStepRef = useRef<PostIntakeWizardStep | null>(null);
  const mountedRef = useRef(false);
  const stepRef = useRef(step);
  const needDraftRef = useRef(needDraft);

  useEffect(() => {
    stepRef.current = step;
    needDraftRef.current = needDraft;
  }, [step, needDraft]);

  useEffect(() => {
    setPostIntakeTelemetryContext({
      templateId: templateId || needDraft?.templateId || 'general',
      categorySlug: categorySlug ?? null,
      step: toTelemetryStep(step),
      completionScore: needDraft?.completionScore,
    });
  }, [templateId, categorySlug, step, needDraft?.templateId, needDraft?.completionScore]);

  useEffect(() => {
    const telemetryStep = toTelemetryStep(step);
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevStepRef.current = telemetryStep;
      trackStepChange(telemetryStep, { fromStep: null });
      return;
    }
    if (prevStepRef.current === telemetryStep) return;
    trackStepChange(telemetryStep, { fromStep: prevStepRef.current });
    prevStepRef.current = telemetryStep;
  }, [step]);

  useEffect(() => {
    const onPageHide = () => {
      const current = stepRef.current;
      if (current === 'done') return;
      trackDropoff({
        reason: 'navigation',
        lastStep: toTelemetryStep(current),
        completionScore: needDraftRef.current?.completionScore,
      });
      flushPostIntakeTelemetry();
    };

    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  useEffect(() => {
    return () => {
      const current = stepRef.current;
      if (current === 'done' || current === 'publishing') return;
      trackDropoff({
        reason: 'page_unmount',
        lastStep: toTelemetryStep(current),
        completionScore: needDraftRef.current?.completionScore,
      });
      flushPostIntakeTelemetry();
    };
  }, []);
}
