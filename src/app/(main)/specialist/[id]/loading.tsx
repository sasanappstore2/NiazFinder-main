export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
      <div className="flex items-center gap-4">
        <div className="size-20 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-48 animate-pulse rounded-xl bg-muted/50" />
          <div className="h-48 animate-pulse rounded-xl bg-muted/50" />
        </div>
        <div className="space-y-4">
          <div className="h-60 animate-pulse rounded-xl bg-muted/50" />
          <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
