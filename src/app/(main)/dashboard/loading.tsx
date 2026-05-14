export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/50" />
      ))}
    </div>
  );
}
