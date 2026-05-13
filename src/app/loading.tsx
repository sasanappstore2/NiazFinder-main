import { Skeleton } from '@/components/ui/skeleton';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-6 w-28" />
          </div>

          {/* Nav Items */}
          <nav className="hidden items-center gap-6 md:flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-lg md:hidden" />
          </div>
        </div>
      </header>

      {/* Hero Section Skeleton */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <Skeleton className="mx-auto mb-4 h-4 w-32 rounded-full" />
          <Skeleton className="mx-auto mb-6 h-10 w-72 sm:h-12 sm:w-96" />
          <Skeleton className="mx-auto mb-8 h-5 w-96 max-w-full" />
          <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row">
            <Skeleton className="h-12 flex-1 rounded-lg" />
            <Skeleton className="h-12 w-32 rounded-lg" />
          </div>
        </div>
      </section>

      {/* Stats Skeleton */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card/60 p-4 text-center"
            >
              <Skeleton className="mx-auto mb-2 h-8 w-16" />
              <Skeleton className="mx-auto h-3 w-20" />
            </div>
          ))}
        </div>
      </section>

      {/* Categories Grid Skeleton */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <Skeleton className="mx-auto mb-6 h-7 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card/60 p-4 text-center"
            >
              <Skeleton className="mx-auto mb-3 h-10 w-10 rounded-lg" />
              <Skeleton className="mx-auto h-4 w-20" />
            </div>
          ))}
        </div>
      </section>

      {/* Content Cards Grid Skeleton */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <Skeleton className="mx-auto mb-6 h-7 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card/60 p-4"
            >
              <Skeleton className="mb-3 h-4 w-3/4" />
              <Skeleton className="mb-2 h-3 w-full" />
              <Skeleton className="mb-4 h-3 w-5/6" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
