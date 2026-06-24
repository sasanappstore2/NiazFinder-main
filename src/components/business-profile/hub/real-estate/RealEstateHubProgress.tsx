'use client';

import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toPersianDigits } from '@/lib/format/digits';
import type { RealEstateCompletionResult } from '@/lib/business/real-estate-hub-completion';
import { REAL_ESTATE_TASK_LABELS } from '@/lib/business/real-estate-hub-tasks';
import { useRealEstateHub } from './RealEstateHubProvider';

export function RealEstateHubProgress({
  completion,
}: {
  completion: RealEstateCompletionResult | null;
}) {
  const { navigateToTask } = useRealEstateHub();
  if (!completion) return null;

  const incomplete = completion.items.filter((i) => !i.completed);
  const next = incomplete[0];

  return (
    <div className="rounded-xl border border-blue-500/20 bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">تکمیل پروفایل املاک</span>
            <span className="text-muted-foreground">{toPersianDigits(completion.percent)}٪</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
          {next && (
            <p className="text-xs text-muted-foreground">قدم بعدی: {next.label}</p>
          )}
        </div>
        {next && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1 self-start sm:self-center"
            onClick={() => navigateToTask(next.taskId)}
          >
            {REAL_ESTATE_TASK_LABELS[next.taskId]}
            <ChevronLeft className="size-4" />
          </Button>
        )}
      </div>
      {incomplete.length > 0 && incomplete.length <= 6 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {incomplete.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigateToTask(item.taskId)}
                className={cn(
                  'rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs',
                  'text-primary hover:bg-primary/15'
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
