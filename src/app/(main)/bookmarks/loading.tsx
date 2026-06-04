'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/skeleton';

function BookmarkRowSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-4 w-12 rounded-md" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-6 w-full max-w-md rounded-md" />
      <Skeleton className="mb-3 h-4 w-full rounded-md" />
      <Skeleton className="mb-3 h-7 w-28 rounded-xl" />
      <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-3">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    </div>
  );
}

export default function BookmarksLoading() {
  return (
    <PageContainer width="medium">
      <Skeleton className="mb-4 h-6 w-48 rounded-md" />
      <Skeleton className="mb-6 h-4 w-full max-w-md rounded-md" />
      <Skeleton className="mb-4 h-10 w-full rounded-md" />
      <div className="mb-6 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <BookmarkRowSkeleton key={i} />
        ))}
      </div>
    </PageContainer>
  );
}
