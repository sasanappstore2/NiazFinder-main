'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { MatchedBusinessRowSkeleton } from '@/components/need/MatchedBusinessesSection';

export function NeedDetailSkeleton() {
  return (
    <div className="min-h-screen animate-in fade-in duration-300" dir="rtl" aria-busy="true" aria-label="در حال بارگذاری آگهی">
      <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-6">
        <Skeleton className="mb-3 h-8 w-24 rounded-md" />

        <div className="flex flex-col gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full max-w-md rounded-md" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-3">
              <Skeleton className="size-11 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
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
