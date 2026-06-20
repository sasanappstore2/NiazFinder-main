'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildIntakeUnderstanding } from '@/lib/need-intake/build-intake-understanding';
import type { FieldState } from '@/intake/intelligence-engine/types';
import { TypingIndicator } from './realtime/TypingIndicator';
import { INTAKE_COPY } from './intake-copy';

export interface IntakeAiUnderstandingCardProps {
  intentGist: string | null;
  fieldMeta: Record<string, FieldState> | null;
  analyzing: boolean;
  aiInvoked?: boolean;
  className?: string;
}

export function IntakeAiUnderstandingCard({
  intentGist,
  fieldMeta,
  analyzing,
  aiInvoked,
  className,
}: IntakeAiUnderstandingCardProps) {
  const view = buildIntakeUnderstanding({ intentGist, fieldMeta, aiInvoked });
  const hasContent = Boolean(view.summary || view.highlights.length > 0);

  if (!analyzing && !hasContent) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 shadow-sm',
        className
      )}
      aria-live="polite"
      aria-busy={analyzing}
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
        <Sparkles className="size-4 shrink-0" aria-hidden />
        <span>{INTAKE_COPY.aiUnderstandingTitle}</span>
        {analyzing ? <TypingIndicator status="analyzing" className="mr-auto" /> : null}
      </div>

      {analyzing && !hasContent ? (
        <p className="text-sm text-muted-foreground">{INTAKE_COPY.aiUnderstandingLoading}</p>
      ) : null}

      {view.summary ? (
        <p className="text-sm leading-relaxed text-foreground">{view.summary}</p>
      ) : null}

      {view.highlights.length > 0 ? (
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

      {!analyzing && view.aiInvoked ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{INTAKE_COPY.aiUnderstandingFootnote}</p>
      ) : null}
    </section>
  );
}
