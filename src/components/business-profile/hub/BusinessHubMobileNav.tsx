'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { routeBuilder } from '@/config/routes';
import { useBusinessHub } from './BusinessHubContext';
import { getVisibleHubTasks } from './hub-tasks';
import type { HubTaskId } from './types';

export function BusinessHubMobileNav() {
  const router = useRouter();
  const { activeTask, setActiveTask, profile } = useBusinessHub();
  const items = getVisibleHubTasks(profile);

  const selectTask = (id: HubTaskId) => {
    if (id === 'filings') {
      router.push(routeBuilder.workspace());
      return;
    }
    setActiveTask(id);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[max(0px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      aria-label="منوی کسب‌وکار"
    >
      <div className="mx-auto flex max-w-lg">
        {items.map(({ id, shortLabel, icon: Icon }) => {
          const active = activeTask === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTask(id)}
              className={cn(
                'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium touch-target-min',
                active ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('size-5', active && 'text-emerald-600')} />
              {shortLabel}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
