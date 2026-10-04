'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { routeBuilder } from '@/config/routes';
import { cn } from '@/lib/utils';
import { WorkspaceDateClock } from './WorkspaceDateClock';
import type { WorkspaceColumnId } from './types';

const TAB_LABELS: Record<WorkspaceColumnId, string> = {
  needs: 'نیازهای مرتبط',
  files: 'فایل‌های منطقه',
  collaborations: 'همکاری‌ها',
  followups: 'پیگیری‌ها',
};

const TAB_ORDER: WorkspaceColumnId[] = ['needs', 'files', 'collaborations', 'followups'];

export function WorkspaceHeader({
  activeTab,
  onTabChange,
  tabCounts,
  unreadNotifications,
  actions,
  search,
  quickAdd,
}: {
  activeTab: WorkspaceColumnId;
  onTabChange: (tab: WorkspaceColumnId) => void;
  tabCounts: Record<WorkspaceColumnId, number>;
  unreadNotifications?: number;
  actions?: ReactNode;
  /** Cross-column search input — rendered on its own row so it never gets squeezed. */
  search?: ReactNode;
  /** "افزودن سریع" dropdown — sits next to the notification bell. */
  quickAdd?: ReactNode;
}) {
  const activeLabel = TAB_LABELS[activeTab];
  const activeCount = tabCounts[activeTab];

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-border/60 px-4 pb-2 pt-2 lg:px-6">
      <div className="flex items-center justify-between gap-2">
        <Select value={activeTab} onValueChange={(v) => onTabChange(v as WorkspaceColumnId)}>
          <SelectTrigger
            size="sm"
            className={cn(
              'h-8 min-w-0 border-border/60 bg-muted/30 text-xs font-medium lg:hidden',
              'max-w-[min(100%,14rem)]'
            )}
            aria-label="انتخاب بخش میزکار"
          >
            <SelectValue placeholder={activeLabel}>
              <span className="truncate">
                {activeLabel}
                <span className="ms-1 text-muted-foreground">
                  ({activeCount.toLocaleString('fa-IR')})
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {TAB_ORDER.map((tab) => (
              <SelectItem key={tab} value={tab}>
                {TAB_LABELS[tab]}
                <span className="ms-1 text-muted-foreground">
                  ({tabCounts[tab].toLocaleString('fa-IR')})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <h1 className="hidden shrink-0 text-sm font-semibold text-foreground lg:block">
          میزکار
        </h1>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          {actions ? <div className="hidden flex-wrap gap-2 sm:flex">{actions}</div> : null}
          {quickAdd}
          <WorkspaceDateClock />
          <Button variant="ghost" size="icon" className="relative size-8 shrink-0" asChild>
            <Link href={routeBuilder.notifications()} aria-label="اعلان‌ها">
              <Bell className="size-4" />
              {unreadNotifications && unreadNotifications > 0 ? (
                <span className="absolute -top-0.5 -inset-e-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-white">
                  {unreadNotifications > 99 ? '۹۹+' : unreadNotifications.toLocaleString('fa-IR')}
                </span>
              ) : null}
            </Link>
          </Button>
        </div>
      </div>

      {search ? (
        <div className="flex flex-wrap items-center gap-2">
          {search}
          {actions ? <div className="flex flex-wrap gap-2 sm:hidden">{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
