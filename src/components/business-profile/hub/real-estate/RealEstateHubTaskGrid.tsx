'use client';

import {
  Building2,
  FileText,
  Home,
  ImageIcon,
  LayoutGrid,
  LayoutList,
  MapPinned,
  UserRound,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RealEstateCompletionResult } from '@/lib/business/real-estate-hub-completion';
import type { RealEstateHubTask, RealEstateHubTaskId } from '@/lib/business/real-estate-hub-tasks';
import { useRealEstateHub } from './RealEstateHubProvider';
import { RE_HUB_ICON } from './real-estate-hub-tokens';

const ICONS: Record<RealEstateHubTaskId, typeof Home> = {
  overview: LayoutGrid,
  profile: UserRound,
  brand: Building2,
  listings: Home,
  portfolio: ImageIcon,
  services: LayoutList,
  coverage: MapPinned,
  widgets: LayoutGrid,
  documents: FileText,
  contacts: Users,
};

export function RealEstateHubTaskGrid({
  tasks,
  completion,
}: {
  tasks: RealEstateHubTask[];
  completion: RealEstateCompletionResult | null;
}) {
  const { activeTask, navigateToTask } = useRealEstateHub();

  const incompleteByTask = (taskId: RealEstateHubTaskId) =>
    completion?.items.some((i) => !i.completed && i.taskId === taskId) ?? false;

  return (
    <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {tasks.map(({ id, label, hint }) => {
        const Icon = ICONS[id];
        const needsWork = incompleteByTask(id);
        const active = activeTask === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => navigateToTask(id)}
            className={cn(
              'flex min-h-[88px] flex-col items-start gap-2 rounded-xl border p-4 text-right transition-colors',
              active
                ? 'border-border bg-accent ring-1 ring-border/80'
                : 'border-border/60 bg-background hover:bg-accent'
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <Icon
                className={cn('size-5 shrink-0', active ? RE_HUB_ICON : 'text-muted-foreground')}
              />
              {needsWork && (
                <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
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
