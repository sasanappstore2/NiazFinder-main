'use client';

import { SpecialistCardSkeleton } from './SpecialistCardSkeleton';

interface SpecialistListSkeletonProps {
  count?: number;
  className?: string;
}

export function SpecialistListSkeleton({
  count = 6,
  className,
}: SpecialistListSkeletonProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className ?? ''}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SpecialistCardSkeleton key={i} />
      ))}
    </div>
  );
}
