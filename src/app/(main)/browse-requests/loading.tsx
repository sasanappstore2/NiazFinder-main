export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl bg-muted/50" />
      ))}
    </div>
  );
}
