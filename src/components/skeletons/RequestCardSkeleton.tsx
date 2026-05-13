'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface RequestCardSkeletonProps {
  className?: string;
}

export function RequestCardSkeleton({ className }: RequestCardSkeletonProps) {
  return (
    <div
      className={`glass-card rounded-xl p-4 space-y-3 card-shadow-sm ${className ?? ''}`}
    >
      {/* Header: priority badge + category */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-14 rounded-full bg-primary/10" />
        <Skeleton className="h-5 w-20 rounded-full bg-primary/5" />
        <Skeleton className="h-5 w-12 rounded-full bg-primary/5 ms-auto" />
      </div>

      {/* Title bar */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-4/5 rounded-md" />
        {/* Description lines (3 lines of varying width) */}
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-[90%] rounded" />
        <Skeleton className="h-3.5 w-3/4 rounded" />
      </div>

      {/* Tags row (3 small pills) */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-5 w-16 rounded-md bg-primary/5" />
        <Skeleton className="h-5 w-20 rounded-md bg-primary/5" />
        <Skeleton className="h-5 w-14 rounded-md bg-primary/5" />
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Budget badge + meta */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28 rounded-lg bg-primary/10" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
      </div>

      {/* User avatar + name row */}
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-3.5 w-24 rounded" />
        <Skeleton className="h-3 w-20 rounded ms-auto" />
      </div>
    </div>
  );
}
