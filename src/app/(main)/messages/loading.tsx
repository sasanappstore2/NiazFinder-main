export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex gap-4 h-[calc(100vh-200px)]">
        <div className="w-80 shrink-0 space-y-3">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
