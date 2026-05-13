'use client';

import { RequestCardSkeleton } from './RequestCardSkeleton';

interface RequestListSkeletonProps {
  count?: number;
  className?: string;
}

export function RequestListSkeleton({
  count = 6,
  className,
}: RequestListSkeletonProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className ?? ''}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <RequestCardSkeleton key={i} />
      ))}
    </div>
  );
}
