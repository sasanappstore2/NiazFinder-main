'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function FilingListCardSkeleton() {
  return (
    <article className="filing-list-card box box-list file clearfix" aria-hidden>
      <div className="top">
        <Skeleton className="size filing-list-card__skel-size shrink-0" />
        <div className="top__main space-y-2">
          <div className="top__meta flex gap-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-[85%]" />
        </div>
      </div>
      <div className="pricing pricing--multi gap-3 p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="features gap-3 p-3">
        <Skeleton className="h-10 w-12" />
        <Skeleton className="h-10 w-12" />
        <Skeleton className="h-10 w-12" />
      </div>
    </article>
  );
}

export function FilingBrowseResultsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="filing-browse-grid" aria-busy="true" aria-label="در حال بارگذاری فایل‌ها">
      {Array.from({ length: count }, (_, i) => (
        <FilingListCardSkeleton key={i} />
      ))}
    </div>
  );
}
