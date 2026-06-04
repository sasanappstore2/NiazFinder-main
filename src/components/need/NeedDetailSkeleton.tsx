'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { MatchedBusinessRowSkeleton } from '@/components/need/MatchedBusinessesSection';

export function NeedDetailSkeleton() {
  return (
    <div
      className="min-h-screen animate-in fade-in duration-300"
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری آگهی"
    >
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-6">
          <Skeleton className="h-9 w-20 rounded-md" />
          <div className="flex gap-1">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
          </div>
        </div>

        <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-3">
            <Skeleton className="h-8 w-full max-w-lg rounded-md" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40 rounded-md" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[4.25rem] rounded-xl" />
              ))}
            </div>
          </div>

          <Skeleton className="h-16 w-full rounded-xl" />

          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>

          <div className="rounded-2xl border border-border/60 p-4">
            <div className="mb-3 flex gap-3">
              <Skeleton className="size-12 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-11 rounded-xl" />
              <Skeleton className="h-11 rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="h-6 w-40 rounded-md" />
        </div>
        <Skeleton className="mb-4 h-4 w-full max-w-sm rounded-md" />
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <ul className="space-y-3">
            {[1, 2, 3].map((i) => (
              <MatchedBusinessRowSkeleton key={i} />
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
