'use client';

import { AlertCircle } from 'lucide-react';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';
import { cn } from '@/lib/utils';

interface IntakeGapClarificationPromptProps {
  gaps: IntakeParseGap[];
  className?: string;
  maxItems?: number;
  onSelectField?: (fieldKey: string) => void;
}

/**
 * Surfaces intelligence-engine gap-detector clarifications on compose.
 * Replaces silent shadow-only cognitive clarifications with user-visible prompts.
 */
export function IntakeGapClarificationPrompt({
  gaps,
  className,
  maxItems = 4,
  onSelectField,
}: IntakeGapClarificationPromptProps) {
  const visible = gaps
    .filter((g) => g.kind === 'missing' || g.kind === 'uncertain' || g.kind === 'clarify')
    .slice(0, maxItems);
  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-1.5 flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        برای درک بهتر نیاز، این موارد را مشخص کنید
      </div>
      <ul className="space-y-1.5">
        {visible.map((gap) => (
          <li key={gap.id}>
            {gap.fieldKey && onSelectField ? (
              <button
                type="button"
                className="text-start text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => onSelectField(gap.fieldKey!)}
              >
                {gap.messageFa}
              </button>
            ) : (
              <span className="text-muted-foreground">{gap.messageFa}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
