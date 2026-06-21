'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, Loader2, MapIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMapAreaSheetDrag } from '@/components/map/use-map-area-sheet-drag';
import {
  MAP_AREA_SHEET_PEEK,
  MAP_AREA_SHEET_SNAP_FULL,
  MAP_AREA_SHEET_SNAP_MID,
  resolveMapAreaPeekHeightPx,
} from '@/components/map/map-area-sheet-constants';

export { MAP_AREA_SHEET_PEEK, MAP_AREA_SHEET_SNAP_MID, MAP_AREA_SHEET_SNAP_FULL };

function isPeekSnap(snap: number | string | null): boolean {
  return snap === MAP_AREA_SHEET_PEEK || snap == null;
}

function MapAreaListSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-border/40 p-2.5">
          <Skeleton className="size-[72px] shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-[40%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MapAreaResultsSheet({
  snap,
  onSnapChange,
  sheetTitle,
  sheetHeading,
  count,
  countUnit = '\u0645\u0648\u0631\u062f',
  loading,
  loadingLabel,
  pullHint,
  emptyMessage,
  peekPreview,
  listRef,
  children,
}: {
  snap: number | string | null;
  onSnapChange: (value: number | string | null) => void;
  sheetTitle: string;
  sheetHeading: string;
  count: number;
  countUnit?: string;
  loading: boolean;
  loadingLabel: string;
  pullHint: string;
  emptyMessage?: string;
  peekPreview?: React.ReactNode;
  listRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const peek = useMemo(() => isPeekSnap(snap), [snap]);
  const showPeekPreview = peek && !loading && count > 0 && peekPreview != null;
  const peekHeightPx = useMemo(
    () => resolveMapAreaPeekHeightPx(showPeekPreview),
    [showPeekPreview]
  );

  const { isDragging, displayHeightPx, dragHandleProps } = useMapAreaSheetDrag({
    snap,
    onSnapChange,
    peekHeightPx,
  });

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return createPortal(
    <>
      {!peek ? (
        <button
          type="button"
          aria-label={'\u0628\u0633\u062a\u0646 \u0641\u0647\u0631\u0633\u062a'}
          className="map-area-results-sheet__backdrop fixed inset-0 z-[700] bg-black/40 animate-in fade-in duration-300"
          onClick={() => onSnapChange(MAP_AREA_SHEET_PEEK)}
        />
      ) : null}

      <section
        role="region"
        aria-label={sheetTitle}
        aria-modal={!peek}
        className={cn(
          'map-area-results-sheet business-map-mobile-sheet sheet-safe-area',
          'fixed inset-x-0 bottom-0 z-[701] flex flex-col overflow-hidden',
          'rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.18)]',
          isDragging ? 'transition-none' : 'transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          !peek && 'map-area-results-sheet--expanded'
        )}
        style={{ height: displayHeightPx }}
        dir="rtl"
      >
        <header
          className={cn(
            'map-area-results-sheet__chrome w-full shrink-0 touch-none select-none',
            'border-b border-border/25 px-4 pb-2.5 pt-1.5',
            !peek && 'shadow-sm'
          )}
          aria-label={peek ? pullHint : undefined}
          {...dragHandleProps}
        >
          <div className="mb-2 flex w-full justify-center">
            <span
              className="map-area-results-sheet__handle block h-1 w-12 shrink-0 cursor-grab rounded-full bg-muted-foreground/30 transition-transform active:scale-95 active:cursor-grabbing"
              aria-hidden
            />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 truncate text-right text-[15px] font-bold leading-tight text-foreground">
              {sheetHeading}
            </h2>
            <div className="flex shrink-0 items-center gap-1.5">
              {loading ? (
                <span
                  className="map-area-results-sheet__badge inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-[11px] text-muted-foreground"
                  title={loadingLabel}
                >
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  <span className="sr-only">{loadingLabel}</span>
                </span>
              ) : (
                <span className="map-area-results-sheet__badge inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {count.toLocaleString('fa-IR')} {countUnit}
                </span>
              )}
              {peek ? (
                <ChevronUp
                  className="map-area-results-sheet__chevron-hint size-4 text-muted-foreground/65"
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        </header>

        {showPeekPreview ? (
          <div className="map-area-results-sheet__peek-teaser w-full shrink-0 px-4 py-2">
            {peekPreview}
          </div>
        ) : !peek ? (
          <div
            ref={listRef}
            className={cn(
              'map-area-results-sheet__list w-full min-h-0 flex-1 px-4 pt-2',
              'pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain'
            )}
          >
            {loading ? (
              <MapAreaListSkeleton />
            ) : count === 0 && emptyMessage ? (
              <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
                  <MapIcon className="size-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{emptyMessage}</p>
              </div>
            ) : (
              <div className="space-y-2.5">{children}</div>
            )}
          </div>
        ) : null}
      </section>
    </>,
    document.body
  );
}
