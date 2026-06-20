'use client';

import { toast } from 'sonner';
import type { IntakeStep } from '@/contracts/need-intake';
import {
  canNavigateToIntakeStep,
  type IntakeWizardGuardContext,
} from '@/lib/need-intake/intake-wizard-guards';
import { toPersianDigits } from '@/lib/format/digits';
import { INTAKE_COPY } from './intake-copy';

const CONTENT_STEPS: { key: IntakeStep; label: string }[] = [
  { key: 'need', label: 'نیاز' },
  { key: 'details', label: 'توضیحات' },
  { key: 'location', label: 'دسته و مکان' },
  { key: 'preview', label: 'پیش‌نمایش' },
];

const STEP_COUNT = CONTENT_STEPS.length;

function contentStepIndex(step: IntakeStep): number {
  if (step === 'need') return 0;
  if (step === 'details') return 1;
  if (step === 'location') return 2;
  if (step === 'preview' || step === 'publishing' || step === 'done') return 3;
  return 0;
}

interface IntakeStepTimelineProps {
  step: IntakeStep;
  progressPercent: number;
  onStepSelect?: (step: IntakeStep) => void;
  guardContext?: IntakeWizardGuardContext;
}

export function IntakeStepTimeline({
  step,
  progressPercent,
  onStepSelect,
  guardContext,
}: IntakeStepTimelineProps) {
  const active = contentStepIndex(step);
  const currentLabel = CONTENT_STEPS[active]?.label ?? 'ثبت نیاز';

  const handleStepClick = (index: number) => {
    if (!onStepSelect || step === 'publishing') return;
    if (index >= active) return;
    const target = CONTENT_STEPS[index]?.key;
    if (!target) return;

    if (guardContext) {
      const result = canNavigateToIntakeStep(target, guardContext);
      if (!result.ok) {
        if (result.message) toast.info(result.message);
        return;
      }
    }

    onStepSelect(target);
  };

  return (
    <nav className="intake-step-track" aria-label={INTAKE_COPY.timelineAria}>
      <div
        className="sr-only"
        role="progressbar"
        aria-label={INTAKE_COPY.progressAria}
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      <div className="intake-step-mobile">
        <div className="intake-step-mobile__meta">
          <span className="intake-step-mobile__label">{currentLabel}</span>
          <span className="intake-step-mobile__count">
            {toPersianDigits(String(active + 1))} از {toPersianDigits(String(STEP_COUNT))}
          </span>
        </div>
        <div className="intake-step-mobile__bar">
          <div
            className="intake-step-mobile__bar-fill"
            style={{ width: `${((active + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
        <ol className="intake-step-mobile__chips" aria-label={INTAKE_COPY.timelineAria}>
          {CONTENT_STEPS.map((s, i) => {
            const done = i < active;
            const current = i === active;
            const navigable = i < active && step !== 'publishing';
            return (
              <li key={s.key}>
                <button
                  type="button"
                  className="intake-step-mobile__chip"
                  data-done={done ? 'true' : undefined}
                  data-current={current ? 'true' : undefined}
                  aria-current={current ? 'step' : undefined}
                  disabled={!navigable}
                  onClick={() => handleStepClick(i)}
                >
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
