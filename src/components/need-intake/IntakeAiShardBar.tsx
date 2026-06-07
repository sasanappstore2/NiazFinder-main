'use client';

import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IntakeAiShardKey = 'category' | 'need' | 'city' | 'neighborhood' | 'budget';
export type IntakeAiShardStatus = 'pending' | 'running' | 'done';

const SHARD_LABELS: Record<IntakeAiShardKey, string> = {
  category: 'دسته',
  need: 'نیاز',
  city: 'شهر',
  neighborhood: 'محله',
  budget: 'بودجه',
};

const SHARD_ORDER: IntakeAiShardKey[] = [
  'category',
  'need',
  'city',
  'neighborhood',
  'budget',
];

export function IntakeAiShardBar({
  status,
  active,
}: {
  status: Partial<Record<IntakeAiShardKey, IntakeAiShardStatus>>;
  active: boolean;
}) {
  const hasRunning = SHARD_ORDER.some((k) => status[k] === 'running');
  if (!active && !hasRunning) return null;

  return (
    <div
      className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5"
      role="status"
      aria-live="polite"
    >
      <p className="mb-2 text-xs text-muted-foreground">
        {hasRunning
          ? 'هوش مصنوعی بخش‌های زیر را در پس‌زمینه تکمیل می‌کند — می‌توانید همزمان فرم را ویرایش کنید.'
          : 'پیشنهاد هوشمند — حتماً بررسی کنید'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SHARD_ORDER.map((key) => {
          const s = status[key] ?? 'pending';
          return (
            <span
              key={key}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                s === 'done' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                s === 'running' && 'bg-primary/10 text-primary',
                s === 'pending' && 'bg-muted text-muted-foreground'
              )}
            >
              {s === 'running' ? (
                <Loader2 className="size-3 animate-spin" />
              ) : s === 'done' ? (
                <Check className="size-3" />
              ) : null}
              {SHARD_LABELS[key]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
