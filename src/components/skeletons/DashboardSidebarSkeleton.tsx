'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface DashboardSidebarSkeletonProps {
  className?: string;
}

export function DashboardSidebarSkeleton({ className }: DashboardSidebarSkeletonProps) {
  return (
    <aside
      className={`hidden lg:flex flex-col w-64 border-e border-border bg-card/50 p-4 space-y-6 ${className ?? ''}`}
    >
      {/* Logo placeholder */}
      <div className="flex items-center gap-2 px-2">
        <Skeleton className="size-8 rounded-lg bg-primary/10" />
        <Skeleton className="h-5 w-28 rounded-md" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1">
        {/* Active state indicator */}
        <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-2.5">
          <Skeleton className="size-5 rounded bg-primary/20" />
          <Skeleton className="h-4 w-24 rounded bg-primary/20" />
        </div>

        {/* Inactive nav items */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-2.5">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center gap-3 rounded-lg p-2.5">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <div className="flex items-center gap-3 rounded-lg p-2.5">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      </div>
    </aside>
  );
}
