'use client';

import { Check, HelpCircle, ListChecks, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntakeAgentResult, IntakeAgentFieldProjection } from '@/intake/agent/types';
import { TypingIndicator } from './realtime/TypingIndicator';
import { toPersianDigits } from '@/lib/format/digits';

export interface IntakeAgentVerificationCardProps {
  agent: IntakeAgentResult | null;
  analyzing: boolean;
  onConfirmField?: (field: IntakeAgentFieldProjection) => void;
  onAskField?: (fieldKey: string) => void;
  className?: string;
}

function confidenceTone(confidence: number): string {
  if (confidence >= 0.9) return 'text-emerald-700 dark:text-emerald-400';
  if (confidence >= 0.6) return 'text-amber-700 dark:text-amber-400';
  return 'text-destructive';
}

export function IntakeAgentVerificationCard({
  agent,
  analyzing,
  onConfirmField,
  onAskField,
  className,
}: IntakeAgentVerificationCardProps) {
  if (!analyzing && !agent) return null;

  const showAsAi = Boolean(agent?.aiInvoked || agent?.analysisMode === 'ai');
  const TitleIcon = showAsAi ? Sparkles : ListChecks;
  const pct = agent ? Math.round(agent.confidence * 100) : 0;

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
        <span>من نیاز شما را اینطور فهمیدم</span>
        {analyzing ? <TypingIndicator status="analyzing" className="mr-auto" /> : null}
        {!analyzing && agent ? (
          <span className={cn('mr-auto text-xs font-medium tabular-nums', confidenceTone(agent.confidence))}>
            اطمینان {toPersianDigits(String(pct))}٪
          </span>
        ) : null}
      </div>

      {analyzing && !agent ? (
        <p className="text-sm text-muted-foreground">
          {showAsAi
            ? 'در حال استخراج ساختار نیاز با هوش مصنوعی…'
            : 'در حال تحلیل سریع و ساخت ساختار نیاز…'}
        </p>
      ) : null}

      {agent ? (
        <>
          {agent.categoryLabel || agent.location.city ? (
            <div className="mb-3 space-y-1 text-sm">
              {agent.categoryLabel ? (
                <p>
                  <span className="text-muted-foreground">دسته: </span>
                  {agent.categoryLabel}
                </p>
              ) : null}
              {agent.location.city || agent.location.neighborhood ? (
                <p>
                  <span className="text-muted-foreground">مکان: </span>
                  {[agent.location.city, agent.location.neighborhood].filter(Boolean).join(' / ')}
                </p>
              ) : null}
            </div>
          ) : null}

          {agent.description ? (
            <p className="text-sm leading-relaxed text-foreground">{agent.description}</p>
          ) : null}

          {agent.fields.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {agent.fields.map((f) => {
                const interactive = f.action !== 'auto_accept' && Boolean(onConfirmField);
                return (
                  <li key={f.key}>
                    {interactive ? (
                      <button
                        type="button"
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs',
                          f.action === 'ask'
                            ? 'border-destructive/40 bg-destructive/5'
                            : 'border-amber-500/40 bg-amber-500/5',
                          'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
                        )}
                        onClick={() => onConfirmField?.(f)}
                        title={
                          f.action === 'ask'
                            ? 'اطمینان پایین — برای تایید ضربه بزنید'
                            : 'برای تایید ضربه بزنید'
                        }
                      >
                        {f.action === 'ask' ? (
                          <HelpCircle className="size-3 shrink-0" aria-hidden />
                        ) : (
                          <Check className="size-3 shrink-0" aria-hidden />
                        )}
                        <span className="text-muted-foreground">{f.label}: </span>
                        {f.displayValue}
                        <span className="tabular-nums text-muted-foreground">
                          ({toPersianDigits(String(Math.round(f.confidence * 100)))}٪)
                        </span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs">
                        <span className="text-muted-foreground">{f.label}: </span>
                        {f.displayValue}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {agent.suggestedQuestions.length > 0 ? (
            <div className="mt-4 space-y-2 rounded-xl border border-dashed border-border/80 bg-background/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">فقط این‌ها مانده:</p>
              <ul className="space-y-1.5">
                {agent.suggestedQuestions.slice(0, 3).map((q) => (
                  <li key={`${q.fieldKey}:${q.questionFa}`}>
                    <button
                      type="button"
                      className="text-sm text-foreground underline-offset-2 hover:underline"
                      onClick={() => onAskField?.(q.fieldKey)}
                    >
                      {q.questionFa}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {agent.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {agent.warnings.slice(0, 3).map((w) => (
                <li key={w.code} className="text-[11px] text-amber-800 dark:text-amber-300">
                  {w.messageFa}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
