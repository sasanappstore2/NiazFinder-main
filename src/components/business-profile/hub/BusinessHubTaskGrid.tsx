'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { routeBuilder } from '@/config/routes';
import { useBusinessHub } from './BusinessHubContext';
import { getVisibleHubTasks } from './hub-tasks';
import type { HubTaskId } from './types';

export function BusinessHubTaskGrid({ className }: { className?: string }) {
  const router = useRouter();
  const { activeTask, setActiveTask, completion, profile } = useBusinessHub();
  const tasks = getVisibleHubTasks(profile);

  const selectTask = (id: HubTaskId) => {
    if (id === 'filings') {
      router.push(routeBuilder.workspace());
      return;
    }
    setActiveTask(id);
  };

  const incompleteByTask = (taskId: HubTaskId) =>
    completion?.items.some((i) => !i.completed && i.taskId === taskId) ?? false;

  return (
    <div
      className={cn(
        'hidden gap-3 sm:grid sm:grid-cols-2',
        tasks.length > 5 ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-5',
        className
      )}
    >
      {tasks.map(({ id, label, hint, icon: Icon }) => {
        const needsWork = incompleteByTask(id);
        const active = activeTask === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => selectTask(id)}
            className={cn(
              'flex min-h-[88px] flex-col items-start gap-2 rounded-xl border p-4 text-right transition-colors',
              active
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-border/60 bg-background hover:bg-accent'
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <Icon
                className={cn(
                  'size-5 shrink-0',
                  active ? 'text-emerald-600' : 'text-muted-foreground'
                )}
              />
              {needsWork && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                  ناتمام
                </span>
              )}
            </div>
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </button>
        );
      })}
    </div>
  );
}
