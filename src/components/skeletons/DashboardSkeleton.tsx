'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface DashboardSkeletonProps {
  className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={`space-y-6 p-4 sm:p-6 ${className ?? ''}`}>
      {/* Page title */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-md" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>

      {/* Stats cards row (4 cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="size-9 rounded-lg bg-primary/10" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-3.5 w-28 rounded" />
            {/* Mini chart placeholder */}
            <div className="flex items-end gap-1 h-8">
              {[40, 60, 35, 80, 55, 70, 45].map((h, j) => (
                <Skeleton
                  key={j}
                  className="flex-1 rounded-t bg-primary/10"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent requests table (2 cols) */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-lg bg-primary/10" />
          </div>

          {/* Table header */}
          <div className="hidden sm:flex items-center gap-4 pb-3 border-b border-border">
            <Skeleton className="h-3.5 w-32 rounded" />
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-3.5 w-16 rounded" />
            <Skeleton className="h-3.5 w-16 rounded ms-auto" />
          </div>

          {/* Table rows (5 rows) */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
                <Skeleton className="hidden sm:block h-5 w-14 rounded-full bg-primary/5" />
                <Skeleton className="hidden sm:block h-5 w-16 rounded-full" />
                <Skeleton className="hidden sm:block h-4 w-10 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar: Earnings chart + Quick actions */}
        <div className="space-y-6">
          {/* Earnings chart placeholder */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-8 w-32 rounded" />

            {/* Bar chart */}
            <div className="flex items-end gap-2 h-32">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <Skeleton
                    className="w-full rounded-t bg-primary/15"
                    style={{ height: `${30 + Math.random() * 60}%` }}
                  />
                  <Skeleton className="h-3 w-6 rounded" />
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-primary/30" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-emerald-300/30" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
          </div>

          {/* Quick actions skeleton */}
          <div className="glass-card rounded-xl p-5 space-y-3">
            <Skeleton className="h-5 w-28 rounded-md" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30"
                >
                  <Skeleton className="size-8 rounded-lg bg-primary/10" />
                  <Skeleton className="h-3 w-14 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
