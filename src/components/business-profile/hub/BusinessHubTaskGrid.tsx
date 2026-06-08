'use client';

import { ImageIcon, LayoutList, Store, UserRound, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessHub } from './BusinessHubContext';
import type { HubTaskId } from './types';

const TASKS: {
  id: HubTaskId;
  label: string;
  hint: string;
  icon: typeof Store;
}[] = [
  {
    id: 'storefront',
    label: 'ویترین و محصولات',
    hint: 'دسته و محصول اضافه کنید',
    icon: LayoutList,
  },
  {
    id: 'profile',
    label: 'معرفی و تماس',
    hint: 'نام، موقعیت روی نقشه و تماس',
    icon: UserRound,
  },
  {
    id: 'brand',
    label: 'عکس و لینک‌ها',
    hint: 'لوگو، کاور و شبکه‌های اجتماعی',
    icon: Store,
  },
  {
    id: 'gallery',
    label: 'نمونه کارها',
    hint: 'عکس یا ویدیو از کارهای شما',
    icon: ImageIcon,
  },
  {
    id: 'contacts',
    label: 'مخاطبین و تیم',
    hint: 'بخش‌های تماس و دعوت کارمند',
    icon: Users,
  },
];

export function BusinessHubTaskGrid({ className }: { className?: string }) {
  const { activeTask, setActiveTask, completion } = useBusinessHub();

  const incompleteByTask = (taskId: HubTaskId) =>
    completion?.items.some((i) => !i.completed && i.taskId === taskId) ?? false;

  return (
    <div className={cn('hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-5', className)}>
      {TASKS.map(({ id, label, hint, icon: Icon }) => {
        const needsWork = incompleteByTask(id);
        const active = activeTask === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTask(id)}
            className={cn(
              'flex min-h-[88px] flex-col items-start gap-2 rounded-xl border p-4 text-right transition-colors',
              active
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-border/60 bg-background hover:bg-accent'
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <Icon className={cn('size-5 shrink-0', active ? 'text-emerald-600' : 'text-muted-foreground')} />
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
