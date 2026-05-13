'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface ProfileSkeletonProps {
  className?: string;
}

export function ProfileSkeleton({ className }: ProfileSkeletonProps) {
  return (
    <div className={`space-y-0 ${className ?? ''}`}>
      {/* Cover image placeholder (full width, 200px height) */}
      <div className="relative h-48 sm:h-56 md:h-64">
        <Skeleton className="absolute inset-0 rounded-none" />
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Profile info section (overlapping avatar) */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
            {/* Avatar (80px, overlapping) */}
            <Skeleton className="size-20 sm:size-24 rounded-full border-4 border-background shadow-md shrink-0" />

            {/* Name + bio */}
            <div className="flex-1 space-y-2 pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-40 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full bg-primary/10" />
              </div>
              <Skeleton className="h-4 w-56 rounded" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-3/4 rounded" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pb-4 sm:pb-6">
              <Skeleton className="h-9 w-24 rounded-lg bg-primary/15" />
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Stats grid (4 items) */}
        <div className="grid grid-cols-4 gap-3 py-6 border-y border-border">
          {[
            { w: 'w-8' },
            { w: 'w-10' },
            { w: 'w-8' },
            { w: 'w-12' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 py-2">
              <Skeleton className={`h-6 ${item.w} rounded-md`} />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>

        {/* Skills tags */}
        <div className="py-6 space-y-3">
          <Skeleton className="h-5 w-24 rounded-md" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-7 rounded-full bg-primary/5"
                style={{ width: `${48 + (i % 3) * 20}px` }}
              />
            ))}
          </div>
        </div>

        {/* About section */}
        <div className="py-6 border-t border-border space-y-3">
          <Skeleton className="h-5 w-20 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-[95%] rounded" />
            <Skeleton className="h-3.5 w-4/5 rounded" />
            <Skeleton className="h-3.5 w-[88%] rounded" />
          </div>
        </div>

        {/* Portfolio grid (6 items) */}
        <div className="py-6 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-lg bg-primary/10" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Reviews section */}
        <div className="py-6 border-t border-border space-y-4">
          <Skeleton className="h-5 w-28 rounded-md" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-20 rounded" />
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Skeleton key={j} className="size-3 rounded-sm bg-primary/10" />
                    ))}
                  </div>
                </div>
                <Skeleton className="h-3 w-12 rounded" />
              </div>
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3.5 w-5/6 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
