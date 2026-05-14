export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
      <div className="flex gap-4">
        <div className="w-64 shrink-0 space-y-4">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex-1 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
