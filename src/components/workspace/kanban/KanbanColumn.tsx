'use client';

import type { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function KanbanColumn({
  title,
  count,
  children,
  headerAction,
  className,
  emptyMessage,
  isEmpty,
  error,
  onRetry,
  fillHeight = false,
  dropHint = false,
  subtitle,
}: {
  title: string;
  count: number;
  children: ReactNode;
  headerAction?: ReactNode;
  className?: string;
  emptyMessage: string;
  isEmpty: boolean;
  error?: string;
  onRetry?: () => void;
  /** Optional line under the count (e.g. active filing filters). */
  subtitle?: string;
  /** Fill parent flex height — column body scrolls internally. */
  fillHeight?: boolean;
  /** Visual hint when an external item can be dropped here. */
  dropHint?: boolean;
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-border/60 bg-muted/15',
        fillHeight
          ? 'h-full min-h-0 flex-1'
          : 'min-h-[min(70vh,720px)] min-w-[min(100%,280px)] flex-1',
        className
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-[11px] text-muted-foreground">
            {dropHint ? 'اینجا رها کنید تا یادداشت بگذارید' : `${count.toLocaleString('fa-IR')} مورد`}
          </p>
          {subtitle && !dropHint ? (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground/90">
              {subtitle}
            </p>
          ) : null}
        </div>
        {headerAction}
      </header>

      {error ? (
        <div className="m-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center text-xs text-destructive">
          <p>{error}</p>
          {onRetry ? (
            <button type="button" className="mt-2 underline" onClick={onRetry}>
              تلاش مجدد
            </button>
          ) : null}
        </div>
      ) : null}

      <ScrollArea className="min-h-0 flex-1 overflow-hidden">
        <div className="w-full min-w-0 space-y-2 px-2 py-2">
          {children}
          {isEmpty && !error ? (
            <p className="rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-xs leading-relaxed text-muted-foreground">
              {emptyMessage}
            </p>
          ) : null}
        </div>
      </ScrollArea>
    </section>
  );
}

export function KanbanColumnSkeleton({
  fillHeight = false,
  className,
}: {
  fillHeight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl border border-border/50 bg-muted/20',
        fillHeight ? 'h-full min-h-0 flex-1' : 'min-h-[min(70vh,720px)] min-w-[280px] flex-1',
        className
      )}
    />
  );
}
