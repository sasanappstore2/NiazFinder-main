'use client';

import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useBusinessHub } from './BusinessHubContext';
import type { HubTaskId } from './types';
import { toPersianDigits } from '@/lib/format/digits';

const TASK_LABELS: Record<HubTaskId, string> = {
  storefront: 'ویترین و محصولات',
  profile: 'معرفی و تماس',
  brand: 'عکس و لینک‌ها',
  gallery: 'نمونه کارها',
  contacts: 'مخاطبین و تیم',
};

export function BusinessHubProgress() {
  const { completion, setActiveTask } = useBusinessHub();
  if (!completion) return null;

  const incomplete = completion.items.filter((i) => !i.completed);
  const next = incomplete[0];

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">تکمیل پروفایل</span>
            <span className="text-muted-foreground">{toPersianDigits(completion.percent)}٪</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
          {next && (
            <p className="text-xs text-muted-foreground">
              قدم بعدی: {next.label}
            </p>
          )}
        </div>
        {next && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1 self-start sm:self-center"
            onClick={() => setActiveTask(next.taskId)}
          >
            {TASK_LABELS[next.taskId]}
            <ChevronLeft className="size-4" />
          </Button>
        )}
      </div>
      {incomplete.length > 0 && incomplete.length <= 4 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {incomplete.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActiveTask(item.taskId)}
                className={cn(
                  'rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs',
                  'text-amber-900 dark:text-amber-200 hover:bg-amber-500/20'
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
