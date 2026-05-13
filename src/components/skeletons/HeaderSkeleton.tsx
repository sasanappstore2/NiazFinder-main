'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface HeaderSkeletonProps {
  className?: string;
}

export function HeaderSkeleton({ className }: HeaderSkeletonProps) {
  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md ${className ?? ''}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo placeholder */}
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-lg bg-primary/10" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>

        {/* Nav items (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-14 rounded" />
          ))}
        </nav>

        {/* Auth buttons + mobile menu */}
        <div className="flex items-center gap-3">
          <Skeleton className="hidden sm:block h-9 w-20 rounded-lg bg-primary/10" />
          <Skeleton className="hidden sm:block h-9 w-24 rounded-lg bg-primary/20" />
          {/* Mobile menu button */}
          <Skeleton className="md:hidden size-9 rounded-lg" />
        </div>
      </div>
    </header>
  );
}
