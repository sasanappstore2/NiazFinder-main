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
        'relative overflow-hidden rounded-2xl border border-primary/25 p-4',
        'bg-gradient-to-br from-primary/[0.10] via-primary/[0.045] to-transparent',
        'shadow-[0_12px_34px_-18px_color-mix(in_oklch,var(--primary)_40%,black)] ring-1 ring-inset ring-primary/10',
        className
      )}
      aria-live="polite"
      aria-busy={analyzing}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-primary/40 to-transparent"
      />
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/25">
          <Sparkles className="size-3.5" aria-hidden />
        </span>
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
              className="rounded-full border border-primary/20 bg-background/50 px-3 py-1 text-xs text-foreground backdrop-blur-sm"
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
