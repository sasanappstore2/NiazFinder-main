'use client';

import { Check, Circle } from 'lucide-react';
import type { IntakeStep } from '@/contracts/need-intake';
import { cn } from '@/lib/utils';

const STEPS: { key: IntakeStep | 'detect'; label: string }[] = [
  { key: 'detect', label: 'تشخیص' },
  { key: 'questioning', label: 'جزئیات' },
  { key: 'preview', label: 'پیش‌نمایش' },
  { key: 'publishing', label: 'ثبت' },
];

function stepIndex(step: IntakeStep): number {
  if (step === 'idle' || step === 'parsing' || step === 'clarifying') return 0;
  if (step === 'questioning' || step === 'chatting' || step === 'summary') return 1;
  if (step === 'preview') return 2;
  if (step === 'publishing' || step === 'done') return 3;
  return 0;
}

export function IntakeStepTimeline({ step }: { step: IntakeStep }) {
  const active = stepIndex(step);

  return (
    <ol
      className="mb-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm"
      aria-label="مراحل ثبت نیاز"
    >
      {STEPS.map((s, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={s.key} className="flex items-center gap-2">
            {i > 0 && (
              <span
                className={cn(
                  'hidden sm:inline h-px w-6',
                  done ? 'bg-primary' : 'bg-border'
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                done && 'border-primary/30 bg-primary/5 text-primary',
                current && 'border-primary bg-primary/10 text-primary font-medium',
                !done && !current && 'border-border text-muted-foreground'
              )}
            >
              {done ? (
                <Check className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <Circle
                  className={cn('size-3 shrink-0', current && 'fill-primary/20')}
                  aria-hidden
                />
              )}
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
