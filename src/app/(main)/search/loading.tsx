export default function SearchLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-12" dir="rtl">
      {/* Search input skeleton */}
      <div className="mb-6">
        <div className="h-12 w-full rounded-xl bg-muted/50 animate-pulse" />
      </div>

      {/* Stats bar skeleton */}
      <div className="mb-4 flex items-center gap-4">
        <div className="h-4 w-48 animate-pulse rounded bg-muted/50" />
        <div className="h-4 w-px bg-muted-foreground/20" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted/50" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted/50" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
      </div>

      {/* Tabs skeleton */}
      <div className="mb-4 h-10 w-full rounded-lg bg-muted/30 animate-pulse flex items-center gap-1 px-1">
        <div className="h-8 w-1/3 rounded-md bg-muted/60" />
        <div className="h-8 w-1/3 rounded-md bg-muted/40" />
        <div className="h-8 w-1/3 rounded-md bg-muted/40" />
      </div>

      {/* Result cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="border border-border/50 rounded-xl p-4 flex items-center gap-3"
          >
            <div className="h-12 w-12 rounded-full bg-muted/50 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-32 bg-muted/50 animate-pulse rounded" />
                <div className="h-4 w-4 rounded-full bg-muted/50 animate-pulse" />
              </div>
              <div className="h-3 w-48 bg-muted/50 animate-pulse rounded" />
              <div className="h-3 w-56 bg-muted/50 animate-pulse rounded" />
              <div className="flex gap-3 pt-1">
                <div className="h-3 w-16 bg-muted/50 animate-pulse rounded" />
                <div className="h-3 w-20 bg-muted/50 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
