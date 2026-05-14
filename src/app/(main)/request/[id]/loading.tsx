export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-3/4 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-muted/50" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
