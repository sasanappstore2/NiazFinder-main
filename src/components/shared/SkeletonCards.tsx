'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// ============ Request Card Skeleton ============
export function RequestCardSkeleton() {
  return (
    <Card className="rounded-xl overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header row: priority badge + category */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Title */}
        <Skeleton className="h-5 w-3/4 rounded-md" />

        {/* Description lines */}
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-5/6 rounded" />
        </div>

        {/* Tags */}
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>

        {/* Divider */}
        <Skeleton className="h-px w-full" />

        {/* Footer row: budget, city, proposals */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28 rounded" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>

        {/* User row */}
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded mr-auto" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Specialist Card Skeleton ============
export function SpecialistCardSkeleton() {
  return (
    <Card className="rounded-xl overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Avatar + Name + Rating row */}
        <div className="flex items-center gap-3">
          {/* Circular avatar */}
          <Skeleton className="size-14 rounded-full shrink-0" />

          <div className="flex-1 space-y-2">
            {/* Name */}
            <Skeleton className="h-4 w-32 rounded" />
            {/* Title / bio line */}
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        </div>

        {/* Rating + stats row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-3.5 w-8 rounded" />
          </div>
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>

        {/* Skill badges */}
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-md" />
          <Skeleton className="h-6 w-18 rounded-md" />
        </div>

        {/* Divider */}
        <Skeleton className="h-px w-full" />

        {/* Online status + city */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-2.5 rounded-full" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Dashboard Stats Skeleton ============
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-xl">
          <CardContent className="p-4 space-y-3">
            {/* Icon */}
            <Skeleton className="size-9 rounded-lg" />
            {/* Number */}
            <Skeleton className="h-7 w-20 rounded" />
            {/* Label */}
            <Skeleton className="h-3.5 w-28 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
