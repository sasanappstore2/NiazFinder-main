'use client';

import { useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize-textarea';
import { toPersianDigits } from '@/lib/format/digits';
import { cn } from '@/lib/utils';
import {
  intakeComposerSurface,
  intakeComposerTextarea,
  INTAKE_DETAILS_MIN_CHARS,
} from './intake-ui-tokens';
import type { IntakeAnalysisMode } from '@/lib/intake/rules-only-mode';
import {
  INTAKE_COPY,
  intakeAnalyzingNeed,
  intakeComposerHint,
} from './intake-copy';
import { TypingIndicator } from './realtime/TypingIndicator';

export interface IntakeComposerTextareaProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minCharsHint?: number;
  showCharProgress?: boolean;
  showCharCount?: boolean;
  showFooter?: boolean;
  highlightFromHome?: boolean;
  analyzing?: boolean;
  analysisMode?: IntakeAnalysisMode;
  className?: string;
}

export function IntakeComposerTextarea({
  id,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  minCharsHint = INTAKE_DETAILS_MIN_CHARS,
  showCharProgress = false,
  showCharCount = true,
  showFooter = true,
  highlightFromHome = false,
  analyzing = false,
  analysisMode = 'rules',
  className,
}: IntakeComposerTextareaProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 88,
    maxHeight: 280,
  });

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const len = value.trim().length;
  const progress = showCharProgress
    ? Math.min(100, Math.round((len / minCharsHint) * 100))
    : 0;

  return (
    <div
      className={cn(
        intakeComposerSurface,
        highlightFromHome && 'ring-2 ring-primary/25 ring-offset-2 ring-offset-background',
        className
      )}
    >
      {highlightFromHome ? (
        <p className="px-3 pt-2 text-xs font-medium text-primary">{INTAKE_COPY.homeSeedBanner}</p>
      ) : null}
      <Textarea
        ref={textareaRef}
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={intakeComposerTextarea}
        rows={3}
      />
      {showFooter ? (
        <div className="flex items-center justify-between gap-2 px-3 pb-2 text-xs text-muted-foreground">
          {showCharProgress ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {analyzing ? (
                <TypingIndicator status="analyzing" className="shrink-0" />
              ) : (
                <span className="shrink-0 tabular-nums">
                  {len >= minCharsHint
                    ? INTAKE_COPY.charsEnough
                    : INTAKE_COPY.charsRemaining(toPersianDigits(String(minCharsHint - len)))}
                </span>
              )}
            </div>
          ) : (
            <span className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground/80">
              {analyzing ? (
                <>
                  <TypingIndicator status="analyzing" />
                  <span>{intakeAnalyzingNeed(analysisMode)}</span>
                </>
              ) : (
                intakeComposerHint(analysisMode)
              )}
            </span>
          )}
          {showCharCount ? (
            <span className="shrink-0 tabular-nums">
              {toPersianDigits(String(len))} {INTAKE_COPY.charUnit}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
