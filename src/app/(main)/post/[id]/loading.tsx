export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <div className="flex items-center gap-4">
        <div className="size-12 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-60 animate-pulse rounded-xl bg-muted/50" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
