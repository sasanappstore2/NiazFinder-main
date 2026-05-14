export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
      <div className="flex gap-6">
        <div className="w-56 shrink-0 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
