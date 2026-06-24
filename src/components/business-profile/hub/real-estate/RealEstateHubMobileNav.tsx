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
import type { RealEstateHubTask, RealEstateHubTaskId } from '@/lib/business/real-estate-hub-tasks';
import { useRealEstateHub } from './RealEstateHubProvider';

const MOBILE_ITEMS: RealEstateHubTaskId[] = [
  'overview',
  'listings',
  'portfolio',
  'coverage',
  'profile',
];

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

export function RealEstateHubMobileNav({ tasks }: { tasks: RealEstateHubTask[] }) {
  const { activeTask, navigateToTask } = useRealEstateHub();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const visible = MOBILE_ITEMS.filter((id) => taskMap.has(id)).map((id) => taskMap.get(id)!);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[max(0px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      aria-label="منوی املاک"
    >
      <div className="mx-auto flex max-w-lg">
        {visible.map(({ id, label }) => {
          const Icon = ICONS[id];
          const active = activeTask === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigateToTask(id)}
              className={cn(
                'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium touch-target-min',
                active ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('size-5', active && 'text-blue-600')} />
              {label.split(' ')[0]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
