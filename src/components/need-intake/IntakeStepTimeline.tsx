'use client';

import { Check } from 'lucide-react';
import type { IntakeStep } from '@/contracts/need-intake';
import { cn } from '@/lib/utils';

const STEPS: { key: IntakeStep | 'detect'; label: string }[] = [
  { key: 'need', label: 'نیاز' },
  { key: 'details', label: 'توضیحات' },
  { key: 'location', label: 'دسته و مکان' },
  { key: 'preview', label: 'پیش‌نمایش' },
  { key: 'done', label: 'انتشار' },
];

function stepIndex(step: IntakeStep): number {
  if (step === 'need') return 0;
  if (step === 'details') return 1;
  if (step === 'location') return 2;
  if (step === 'preview') return 3;
  if (step === 'publishing' || step === 'done') return 4;
  return 0;
}

function connectorState(
  segmentIndex: number,
  active: number
): 'complete' | 'active' | 'idle' {
  if (segmentIndex < active) return 'complete';
  if (segmentIndex === active) return 'active';
  return 'idle';
}

interface IntakeStepTimelineProps {
  step: IntakeStep;
  progressPercent: number;
}

export function IntakeStepTimeline({ step, progressPercent }: IntakeStepTimelineProps) {
  const active = stepIndex(step);

  return (
    <div
      className="intake-step-track"
      role="progressbar"
      aria-label="پیشرفت مراحل ثبت نیاز"
      aria-valuenow={Math.round(progressPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <ol className="intake-step-track__list">
        {STEPS.map((s, i) => {
          const done = i < active;
          const current = i === active;
          const hasConnector = i < STEPS.length - 1;
          const segmentState = hasConnector ? connectorState(i, active) : null;

          return (
            <li
              key={s.key}
              className={cn(
                'intake-step-track__segment',
                hasConnector && 'intake-step-track__segment--grow'
              )}
              aria-current={current ? 'step' : undefined}
            >
              <div
                className="intake-step-track__item"
                data-done={done ? 'true' : undefined}
                data-current={current ? 'true' : undefined}
              >
                <div className="intake-step-track__node">
                  {done ? (
                    <Check className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <span aria-hidden>{i + 1}</span>
                  )}
                </div>
                <span className="intake-step-track__label">{s.label}</span>
              </div>
              {segmentState ? (
                <div className="intake-step-track__connector" aria-hidden>
                  <span className="intake-step-track__connector-track" />
                  <span
                    className="intake-step-track__connector-fill"
                    data-state={segmentState}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
