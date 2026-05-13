'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface SpecialistCardSkeletonProps {
  className?: string;
}

export function SpecialistCardSkeleton({ className }: SpecialistCardSkeletonProps) {
  return (
    <div
      className={`glass-card rounded-xl p-5 space-y-4 card-shadow-sm ${className ?? ''}`}
    >
      {/* Avatar + Name + Role */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>

      {/* Rating stars placeholder */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-4 rounded-sm bg-primary/10" />
        ))}
        <Skeleton className="h-3.5 w-8 ms-1 rounded" />
        <Skeleton className="h-3.5 w-20 rounded" />
      </div>

      {/* Skills tags row (4 pills) */}
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-16 rounded-md bg-primary/5" />
        <Skeleton className="h-6 w-20 rounded-md bg-primary/5" />
        <Skeleton className="h-6 w-14 rounded-md bg-primary/5" />
        <Skeleton className="h-6 w-18 rounded-md bg-primary/5" />
      </div>

      {/* Stats row: projects, response rate */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3.5 w-16 rounded" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Online status + city */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-2.5 rounded-full bg-emerald-400/50" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>
        <Skeleton className="h-3 w-16 rounded" />
      </div>

      {/* "View Profile" button placeholder */}
      <Skeleton className="h-9 w-full rounded-lg bg-primary/10" />
    </div>
  );
}
