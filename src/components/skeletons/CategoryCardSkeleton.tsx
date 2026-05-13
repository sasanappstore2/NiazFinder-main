'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface CategoryCardSkeletonProps {
  className?: string;
}

export function CategoryCardSkeleton({ className }: CategoryCardSkeletonProps) {
  return (
    <div
      className={`glass-card rounded-xl p-4 flex flex-col items-center gap-3 card-shadow-sm ${className ?? ''}`}
    >
      {/* Icon circle placeholder */}
      <Skeleton className="size-12 rounded-full bg-primary/10" />

      {/* Category name bar */}
      <Skeleton className="h-4 w-20 rounded-md" />

      {/* Request count badge */}
      <Skeleton className="h-5 w-16 rounded-full bg-primary/5" />
    </div>
  );
}
