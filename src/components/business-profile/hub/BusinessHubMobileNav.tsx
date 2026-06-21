'use client';

import { ImageIcon, LayoutList, Store, UserRound, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessHub } from './BusinessHubContext';
import type { HubTaskId } from './types';

const ITEMS: { id: HubTaskId; label: string; icon: typeof Store }[] = [
  { id: 'storefront', label: 'ویترین', icon: LayoutList },
  { id: 'profile', label: 'معرفی', icon: UserRound },
  { id: 'brand', label: 'عکس', icon: Store },
  { id: 'gallery', label: 'نمونه', icon: ImageIcon },
  { id: 'contacts', label: 'تیم', icon: Users },
];

export function BusinessHubMobileNav() {
  const { activeTask, setActiveTask } = useBusinessHub();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[max(0px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      aria-label="منوی کسب‌وکار"
    >
      <div className="mx-auto flex max-w-lg">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activeTask === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTask(id)}
              className={cn(
                'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium touch-target-min',
                active ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('size-5', active && 'text-emerald-600')} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
