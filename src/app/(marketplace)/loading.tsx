import { Skeleton } from '@/components/ui/skeleton';

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm">
      <Skeleton className="mb-3 h-4 w-3/4" />
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="mb-4 h-3 w-5/6" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function MarketplaceLoading() {
  return (
    <div className="space-y-6">
      {/* Search bar skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Results count */}
      <Skeleton className="h-4 w-32" />

      {/* Card grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
