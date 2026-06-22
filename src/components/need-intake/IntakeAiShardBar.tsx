'use client';

import { Check, Loader2, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntakeProgressSnapshot } from '@/lib/need-intake/intake-progress-tracker';
import { INTAKE_PROGRESS_CORE_LABELS } from '@/lib/need-intake/intake-progress-tracker';

export type IntakeAiShardKey = 'category' | 'need' | 'city' | 'neighborhood' | 'budget';
export type IntakeAiShardStatus = 'pending' | 'running' | 'done';

const CORE_ORDER = ['need', 'category', 'city', 'neighborhood'] as const;

function CoreStepIcon({ status }: { status: string }) {
  if (status === 'running') return <Loader2 className="size-3.5 animate-spin shrink-0" />;
  if (status === 'done') return <Check className="size-3.5 shrink-0" />;
  if (status === 'blocked') return <Lock className="size-3 shrink-0 opacity-60" />;
  return (
    <span className="inline-block size-2 shrink-0 rounded-full border-2 border-current opacity-50" />
  );
}

function coreStepClass(status: string): string {
  if (status === 'done') return 'text-emerald-700 dark:text-emerald-400';
  if (status === 'running') return 'text-primary font-medium';
  if (status === 'blocked') return 'text-muted-foreground/50';
  return 'text-muted-foreground';
}

function fieldChipClass(status: string, required: boolean): string {
  if (status === 'done') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  }
  if (status === 'running') {
    return 'bg-primary/10 text-primary border-primary/25';
  }
  if (required) {
    return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25';
  }
  return 'bg-muted/80 text-muted-foreground border-border/60';
}

export function IntakeAiShardBar({
  snapshot,
  active,
  compact = false,
}: {
  snapshot: IntakeProgressSnapshot;
  active: boolean;
  compact?: boolean;
}) {
  const hasRunning =
    CORE_ORDER.some((k) => snapshot.core[k] === 'running') ||
    snapshot.fields.some((f) => f.status === 'running');

  const categoryDone = snapshot.core.category === 'done';
  const headerLine = snapshot.activeShardLabel
    ? `\u062F\u0631 \u062D\u0627\u0644 \u062A\u0634\u062E\u06CC\u0635: ${snapshot.activeShardLabel}`
    : hasRunning || active
      ? '\u062F\u0631 \u062D\u0627\u0644 \u0628\u0631\u0631\u0633\u06CC \u0645\u062A\u0646 \u0634\u0645\u0627\u2026'
      : snapshot.missingSummaryFa
        ? snapshot.missingSummaryFa
        : '\u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u0647\u0627 \u0622\u0645\u0627\u062F\u0647 \u2014 \u062D\u062A\u0645\u0627\u064B \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F';

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/20 bg-primary/[0.07] shadow-[0_6px_22px_-16px_color-mix(in_oklch,var(--primary)_45%,black)]',
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5 sticky bottom-0 z-10 backdrop-blur-sm'
      )}
      role="status"
      aria-live="polite"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 shrink-0 text-primary/70" />
        <span>{headerLine}</span>
      </p>

      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {CORE_ORDER.map((key, index) => {
          const status = snapshot.core[key];
          const label = INTAKE_PROGRESS_CORE_LABELS[key];
          return (
            <div key={key} className="flex items-center gap-1">
              {index > 0 ? (
                <span className="text-muted-foreground/40 px-0.5" aria-hidden>
                  /
                </span>
              ) : null}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                  coreStepClass(status)
                )}
              >
                <CoreStepIcon status={status} />
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {categoryDone && snapshot.fields.length > 0 ? (
        <div className={cn('space-y-1.5', compact ? 'mt-1.5' : 'mt-2.5')}>
          {!compact ? (
            <p className="text-[11px] text-muted-foreground">
              {'\u0645\u0648\u0627\u0631\u062F \u0628\u0627\u0642\u06CC\u200c\u0645\u0627\u0646\u062F\u0647 \u062F\u0631 \u062F\u0633\u062A\u0647:'}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {snapshot.fields.map((field) => (
              <span
                key={field.key}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  fieldChipClass(field.status, field.required)
                )}
              >
                {field.status === 'running' ? (
                  <Loader2 className="size-2.5 animate-spin" />
                ) : field.status === 'done' ? (
                  <Check className="size-2.5" />
                ) : null}
                {field.label}
                {field.required && field.status !== 'done' ? (
                  <span className="text-[10px] opacity-70" aria-label="\u0627\u0644\u0632\u0627\u0645\u06CC">
                    *
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {!compact && snapshot.missingSummaryFa && (hasRunning || active) ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {'\u0627\u0646\u062A\u062E\u0627\u0628\u200c\u0647\u0627 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC \u0647\u0633\u062A\u0646\u062F \u2014 '}
          {snapshot.missingSummaryFa.replace(/^\u0647\u0646\u0648\u0632:\s*/, '')}
          {' \u0631\u0627 \u062F\u0631 \u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0628\u0646\u0648\u06CC\u0633\u06CC\u062F.'}
        </p>
      ) : null}
    </div>
  );
}
