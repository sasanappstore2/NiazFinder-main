'use client';

import { ListChecks, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildIntakeUnderstanding } from '@/lib/need-intake/build-intake-understanding';
import type { FieldState } from '@/intake/intelligence-engine/types';
import type { IntakeAnalysisMode } from '@/lib/intake/rules-only-mode';
import { TypingIndicator } from './realtime/TypingIndicator';
import {
  INTAKE_COPY,
  intakeUnderstandingFootnote,
  intakeUnderstandingLoading,
  intakeUnderstandingTitle,
} from './intake-copy';

export interface IntakeUnderstandingHighlightAction {
  key: string;
  label: string;
  value: string;
}

export interface IntakeAiUnderstandingCardProps {
  intentGist: string | null;
  fieldMeta: Record<string, FieldState> | null;
  analyzing: boolean;
  aiInvoked?: boolean;
  analysisMode?: IntakeAnalysisMode;
  /** When set, chips become actionable confirm/edit controls. */
  onHighlightSelect?: (highlight: IntakeUnderstandingHighlightAction) => void;
  className?: string;
}

export function IntakeAiUnderstandingCard({
  intentGist,
  fieldMeta,
  analyzing,
  aiInvoked,
  analysisMode = 'rules',
  onHighlightSelect,
  className,
}: IntakeAiUnderstandingCardProps) {
  const view = buildIntakeUnderstanding({
    intentGist,
    fieldMeta,
    aiInvoked,
    analysisMode,
  });
  const hasContent = Boolean(view.summary || view.highlights.length > 0);
  const showAsAi = analysisMode === 'ai' || Boolean(aiInvoked);
  const TitleIcon = showAsAi ? Sparkles : ListChecks;

  if (!analyzing && !hasContent) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border p-4 shadow-sm',
        showAsAi ? 'border-primary/20 bg-primary/[0.04]' : 'border-border/70 bg-muted/30',
        className
      )}
      aria-live="polite"
      aria-busy={analyzing}
    >
      <div
        className={cn(
          'mb-2 flex items-center gap-2 text-sm font-semibold',
          showAsAi ? 'text-primary' : 'text-foreground'
        )}
      >
        <TitleIcon className="size-4 shrink-0" aria-hidden />
        <span>{intakeUnderstandingTitle(analysisMode, aiInvoked)}</span>
        {analyzing ? <TypingIndicator status="analyzing" className="mr-auto" /> : null}
      </div>

      {analyzing && !hasContent ? (
        <p className="text-sm text-muted-foreground">
          {intakeUnderstandingLoading(analysisMode)}
        </p>
      ) : null}

      {view.summary ? (
        <p className="text-sm leading-relaxed text-foreground">{view.summary}</p>
      ) : null}

      {view.highlights.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {view.highlights.map((h) => {
            if (onHighlightSelect) {
              return (
                <li key={h.key}>
                  <button
                    type="button"
                    className={cn(
                      'rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-foreground',
                      'transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
                    )}
                    onClick={() =>
                      onHighlightSelect({ key: h.key, label: h.label, value: h.value })
                    }
                    title={INTAKE_COPY.chipConfirmHint}
                  >
                    <span className="text-muted-foreground">{h.label}: </span>
                    {h.value}
                  </button>
                </li>
              );
            }
            return (
              <li
                key={h.key}
                className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-foreground"
              >
                <span className="text-muted-foreground">{h.label}: </span>
                {h.value}
              </li>
            );
          })}
        </ul>
      ) : null}

      {!analyzing && hasContent ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {intakeUnderstandingFootnote(analysisMode, aiInvoked)}
        </p>
      ) : null}
    </section>
  );
}
