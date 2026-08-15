'use client';

import { ListChecks, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildIntakeUnderstanding } from '@/lib/need-intake/build-intake-understanding';
import type { FieldState } from '@/intake/intelligence-engine/types';
import type { IntakeAnalysisMode } from '@/lib/intake/rules-only-mode';
import { TypingIndicator } from './realtime/TypingIndicator';
import {
  intakeUnderstandingFootnote,
  intakeUnderstandingLoading,
  intakeUnderstandingTitle,
} from './intake-copy';

export interface IntakeAiUnderstandingCardProps {
  intentGist: string | null;
  fieldMeta: Record<string, FieldState> | null;
  analyzing: boolean;
  /** Non-blocking AI enrich — keep chips visible. */
  enriching?: boolean;
  /** True when fieldMeta/gist belong to an older text than the composer. */
  stale?: boolean;
  aiInvoked?: boolean;
  analysisMode?: IntakeAnalysisMode;
  className?: string;
}

export function IntakeAiUnderstandingCard({
  intentGist,
  fieldMeta,
  analyzing,
  enriching = false,
  stale = false,
  aiInvoked,
  analysisMode = 'rules',
  className,
}: IntakeAiUnderstandingCardProps) {
  const view = buildIntakeUnderstanding({
    intentGist,
    fieldMeta,
    aiInvoked,
    analysisMode,
  });
  const busy = enriching || analyzing;
  const showResolved = Boolean(view.summary || view.highlights.length > 0);
  const showAsAi = Boolean(aiInvoked) || enriching;
  const TitleIcon = showAsAi ? Sparkles : ListChecks;

  if (!busy && !showResolved) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border p-4 shadow-sm',
        showAsAi ? 'border-primary/20 bg-primary/[0.04]' : 'border-border/70 bg-muted/30',
        stale && 'opacity-80',
        className
      )}
      aria-live="polite"
      aria-busy={busy}
    >
      <div
        className={cn(
          'mb-2 flex items-center gap-2 text-sm font-semibold',
          showAsAi ? 'text-primary' : 'text-foreground'
        )}
      >
        <TitleIcon className="size-4 shrink-0" aria-hidden />
        <span>{intakeUnderstandingTitle(analysisMode, aiInvoked || enriching)}</span>
        {enriching ? <TypingIndicator status="analyzing" className="mr-auto" /> : null}
      </div>

      {enriching && !showResolved ? (
        <p className="text-sm text-muted-foreground">
          {intakeUnderstandingLoading(analysisMode)}
        </p>
      ) : null}

      {showResolved && view.summary ? (
        <p className="text-sm leading-relaxed text-foreground">{view.summary}</p>
      ) : null}

      {showResolved && view.highlights.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {view.highlights.map((h) => (
            <li
              key={h.key}
              className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-foreground"
            >
              <span className="text-muted-foreground">{h.label}: </span>
              {h.value}
            </li>
          ))}
        </ul>
      ) : null}

      {showResolved ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {intakeUnderstandingFootnote(analysisMode, aiInvoked)}
        </p>
      ) : null}
    </section>
  );
}
