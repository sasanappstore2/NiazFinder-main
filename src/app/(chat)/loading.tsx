import { Skeleton } from '@/components/ui/skeleton';

export default function ChatLoading() {
  return (
    <div className="flex h-full min-h-0 flex-1" dir="rtl">
      {/* Mobile: list-only skeleton */}
      <div className="flex w-full flex-col p-3 md:hidden">
        <Skeleton className="mb-4 h-11 w-full rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-2.5">
              <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: split skeleton */}
      <div className="hidden w-[min(380px,35vw)] border-l border-border/50 bg-background/80 p-3 md:block">
        <Skeleton className="mb-4 h-11 w-full rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50"
            >
              <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-2 w-2 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area Skeleton (desktop only) */}
      <div className="hidden flex-1 flex-col md:flex">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`flex gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}
            >
              <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
              <Skeleton
                className={`h-16 rounded-xl ${i % 2 === 0 ? 'w-48' : 'w-56'}`}
              />
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-border/50 p-3">
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
