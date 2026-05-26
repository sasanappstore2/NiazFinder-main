'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface ChatSkeletonProps {
  className?: string;
}

export function ChatSkeleton({ className }: ChatSkeletonProps) {
  return (
    <div className={`flex h-[calc(100vh-4rem)] overflow-hidden ${className ?? ''}`}>
      {/* Conversation list sidebar */}
      <aside className="hidden sm:flex w-72 flex-col border-e border-border bg-card/30">
        {/* Search bar */}
        <div className="p-3 border-b border-border">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>

        {/* Conversation list (5 items) */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 transition-colors ${
                i === 0 ? 'bg-primary/5' : 'hover:bg-muted/30'
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <Skeleton className="size-10 rounded-full" />
                {i < 3 && (
                  <Skeleton className="absolute bottom-0 inset-e-0 size-3 rounded-full border-2 border-card bg-emerald-400/60" />
                )}
              </div>

              {/* Name + message preview */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-3 w-8 rounded" />
                </div>
                <Skeleton className="h-3 w-36 rounded" />
              </div>

              {/* Unread badge */}
              {i < 2 && (
                <Skeleton className="size-5 rounded-full bg-primary/20 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          {/* Mobile back button */}
          <Skeleton className="sm:hidden size-8 rounded-lg" />
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24 rounded" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-2 rounded-full bg-emerald-400/60" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Date divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-border" />
            <Skeleton className="h-3 w-24 rounded" />
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Message bubbles - alternating left/right */}
          {/* Received (left) */}
          <div className="flex items-end gap-2 max-w-[75%]">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="space-y-1">
              <div className="rounded-2xl rounded-be-sm bg-muted/60 px-4 py-2.5">
                <Skeleton className="h-3.5 w-48 rounded" />
                <Skeleton className="h-3.5 w-36 rounded mt-1" />
              </div>
              <Skeleton className="h-3 w-10 ms-1 rounded" />
            </div>
          </div>

          {/* Sent (right) */}
          <div className="flex items-end gap-2 max-w-[75%] ms-auto flex-row-reverse">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="space-y-1 flex flex-col items-end">
              <div className="rounded-2xl rounded-bs-sm bg-primary/15 px-4 py-2.5">
                <Skeleton className="h-3.5 w-40 rounded" />
              </div>
              <Skeleton className="h-3 w-10 me-1 rounded" />
            </div>
          </div>

          {/* Received */}
          <div className="flex items-end gap-2 max-w-[75%]">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="space-y-1">
              <div className="rounded-2xl rounded-be-sm bg-muted/60 px-4 py-2.5">
                <Skeleton className="h-3.5 w-52 rounded" />
              </div>
              <Skeleton className="h-3 w-10 ms-1 rounded" />
            </div>
          </div>

          {/* Sent */}
          <div className="flex items-end gap-2 max-w-[75%] ms-auto flex-row-reverse">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="space-y-1 flex flex-col items-end">
              <div className="rounded-2xl rounded-bs-sm bg-primary/15 px-4 py-2.5">
                <Skeleton className="h-3.5 w-44 rounded" />
              </div>
              <Skeleton className="h-3 w-10 me-1 rounded" />
            </div>
          </div>

          {/* Typing indicator */}
          <div className="flex items-end gap-2 max-w-[75%]">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="rounded-2xl rounded-be-sm bg-muted/60 px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="typing-dot size-2 rounded-full bg-muted-foreground/40" />
                <div className="typing-dot size-2 rounded-full bg-muted-foreground/40" />
                <div className="typing-dot size-2 rounded-full bg-muted-foreground/40" />
              </div>
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="flex-1 h-10 rounded-xl" />
            <Skeleton className="size-9 rounded-lg bg-primary/15" />
          </div>
        </div>
      </div>
    </div>
  );
}
