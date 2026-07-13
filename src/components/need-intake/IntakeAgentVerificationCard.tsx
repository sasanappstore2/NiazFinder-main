'use client';

import { useState } from 'react';
import { Check, HelpCircle, ListChecks, Pencil, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntakeAgentResult, IntakeAgentFieldProjection } from '@/intake/agent/types';
import { TypingIndicator } from './realtime/TypingIndicator';
import { toPersianDigits } from '@/lib/format/digits';
import type { ProposalFieldStatus } from '@/hooks/use-intake-proposal-confirmation';
import type { LocalLlmHealthState } from '@/hooks/use-local-llm-health';

export interface IntakeAgentVerificationCardProps {
  agent: IntakeAgentResult | null;
  analyzing: boolean;
  proposalStatuses?: Record<string, ProposalFieldStatus>;
  llmHealth?: Pick<LocalLlmHealthState, 'online' | 'labelFa' | 'loading' | 'mode'>;
  onConfirmField?: (field: IntakeAgentFieldProjection) => void;
  onRejectField?: (fieldKey: string) => void;
  onEditField?: (field: IntakeAgentFieldProjection, nextValue: string) => void;
  onAskField?: (fieldKey: string) => void;
  className?: string;
}

function confidenceTone(confidence: number): string {
  if (confidence >= 0.9) return 'text-emerald-700 dark:text-emerald-400';
  if (confidence >= 0.6) return 'text-amber-700 dark:text-amber-400';
  return 'text-destructive';
}

function statusLabel(status: ProposalFieldStatus | undefined): string | null {
  if (status === 'confirmed') return 'تأیید شد';
  if (status === 'edited') return 'ویرایش شد';
  if (status === 'rejected') return 'رد شد';
  return null;
}

export function IntakeAgentVerificationCard({
  agent,
  analyzing,
  proposalStatuses,
  llmHealth,
  onConfirmField,
  onRejectField,
  onEditField,
  onAskField,
  className,
}: IntakeAgentVerificationCardProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  if (!analyzing && !agent) return null;

  const runtimeOnline = llmHealth?.online === true;
  const showAsAi = runtimeOnline || Boolean(agent?.aiInvoked && agent?.analysisMode === 'ai');
  const TitleIcon = showAsAi ? Sparkles : ListChecks;
  const pct = agent ? Math.round(agent.confidence * 100) : 0;
  const pendingFields =
    agent?.fields.filter((f) => {
      const st = proposalStatuses?.[f.key];
      return !st || st === 'pending';
    }) ?? [];

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
          'mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold',
          showAsAi ? 'text-primary' : 'text-foreground'
        )}
      >
        <TitleIcon className="size-4 shrink-0" aria-hidden />
        <span>من نیاز شما را اینطور فهمیدم</span>
        {llmHealth && !llmHealth.loading && llmHealth.labelFa ? (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              llmHealth.online
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground'
            )}
            title={llmHealth.mode}
          >
            {llmHealth.labelFa}
          </span>
        ) : null}
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
            ? 'در حال استخراج پیشنهادها با هوش مصنوعی…'
            : 'در حال تحلیل سریع و ساخت پیشنهادها…'}
        </p>
      ) : null}

      {agent ? (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            هیچ فیلدی تا تأیید شما وارد فرم نمی‌شود. برای هر مورد تأیید، رد یا ویرایش کنید.
          </p>

          {agent.description ? (
            <p className="text-sm leading-relaxed text-foreground">{agent.description}</p>
          ) : null}

          {agent.fields.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {agent.fields.map((f) => {
                const status = proposalStatuses?.[f.key];
                const decided = status === 'confirmed' || status === 'edited' || status === 'rejected';
                const isEditing = editingKey === f.key;
                return (
                  <li
                    key={f.key}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm',
                      status === 'rejected'
                        ? 'border-border/50 bg-muted/40 opacity-60'
                        : status === 'confirmed' || status === 'edited'
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : f.action === 'ask'
                            ? 'border-destructive/30 bg-destructive/5'
                            : 'border-amber-500/30 bg-amber-500/5'
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          آیا {f.label} «{f.displayValue}» درست است؟
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                          اطمینان {toPersianDigits(String(Math.round(f.confidence * 100)))}٪
                          {statusLabel(status) ? ` · ${statusLabel(status)}` : ''}
                        </p>
                      </div>
                      {!decided ? (
                        <div className="flex shrink-0 flex-wrap gap-1">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-600/40 bg-emerald-500/10 px-2.5 py-1 text-xs hover:bg-emerald-500/20"
                            onClick={() => onConfirmField?.(f)}
                          >
                            <Check className="size-3" aria-hidden />
                            تأیید
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
                            onClick={() => onRejectField?.(f.key)}
                          >
                            <X className="size-3" aria-hidden />
                            رد
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
                            onClick={() => {
                              setEditingKey(f.key);
                              setEditDraft(String(f.value ?? f.displayValue));
                            }}
                          >
                            <Pencil className="size-3" aria-hidden />
                            ویرایش
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {isEditing ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          className="min-w-[12rem] flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          aria-label={`ویرایش ${f.label}`}
                        />
                        <button
                          type="button"
                          className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
                          onClick={() => {
                            onEditField?.(f, editDraft);
                            setEditingKey(null);
                          }}
                        >
                          ذخیره
                        </button>
                        <button
                          type="button"
                          className="rounded-full border px-3 py-1 text-xs"
                          onClick={() => setEditingKey(null)}
                        >
                          انصراف
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {pendingFields.length > 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {toPersianDigits(String(pendingFields.length))} پیشنهاد در انتظار تأیید
            </p>
          ) : null}

          {agent.suggestedQuestions.length > 0 ? (
            <div className="mt-4 space-y-2 rounded-xl border border-dashed border-border/80 bg-background/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">سوال‌های تکمیلی:</p>
              <ul className="space-y-1.5">
                {agent.suggestedQuestions.slice(0, 3).map((q) => (
                  <li key={`${q.fieldKey}:${q.questionFa}`}>
                    <button
                      type="button"
                      className="inline-flex items-start gap-1.5 text-sm text-foreground underline-offset-2 hover:underline"
                      onClick={() => onAskField?.(q.fieldKey)}
                    >
                      <HelpCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
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
