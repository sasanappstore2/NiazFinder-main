'use client';

import React, { type ReactNode, useState, useEffect, useRef } from 'react';

interface ProgressiveGridProps<T> {
  /** All items (some may be null/undefined if not yet loaded) */
  items: (T | null | undefined)[];
  /** Total expected item count */
  total: number;
  /** Render function for a loaded item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Skeleton for a single unloaded item */
  skeleton?: ReactNode;
  /** Number of columns (responsive defaults) */
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Additional class for the grid */
  className?: string;
  /** Gap size class */
  gapClass?: string;
}

/**
 * Progressive loading grid that renders items as they become available
 * and shows skeleton placeholders for unloaded items.
 */
export function ProgressiveGrid<T>({
  items,
  total,
  renderItem,
  skeleton,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  className,
  gapClass = 'gap-4',
}: ProgressiveGridProps<T>) {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const prevItemsRef = useRef<(T | null | undefined)[]>(items);

  const lgCols = columns.lg ?? 3;

  // Track newly loaded items and animate them in
  useEffect(() => {
    const newVisible = new Set(visibleItems);

    for (let i = 0; i < total; i++) {
      const item = items[i];
      const prevItem = prevItemsRef.current[i];
      // Item was just loaded (null -> value)
      if (item != null && prevItem == null) {
        // Stagger the visibility based on grid position
        setTimeout(() => {
          setVisibleItems((prev) => new Set([...prev, i]));
        }, (i % lgCols) * 50);
      }
      // Keep already visible items
      if (item != null && newVisible.has(i)) {
        // Already visible, keep it
      }
    }

    prevItemsRef.current = items;
  }, [items, total, lgCols]);

  // Build responsive grid classes
  const gridCols = [
    `grid-cols-${columns.sm ?? 1}`,
    `md:grid-cols-${columns.md ?? 2}`,
    `lg:grid-cols-${columns.lg ?? 3}`,
    `xl:grid-cols-${columns.xl ?? 4}`,
  ].join(' ');

  return (
    <div className={`grid ${gridCols} ${gapClass} ${className ?? ''}`}>
      {Array.from({ length: total }).map((_, index) => {
        const item = items[index];
        const loaded = item != null;
        const visible = loaded && visibleItems.has(index);

        return (
          <div
            key={index}
            className={`transition-all duration-300 ease-out ${
              visible
                ? 'opacity-100 translate-y-0'
                : 'opacity-60 translate-y-1'
            }`}
          >
            {loaded ? renderItem(item, index) : (skeleton ?? <DefaultGridSkeleton />)}
          </div>
        );
      })}
    </div>
  );
}

/** Default skeleton for grid items */
function DefaultGridSkeleton() {
  return (
    <div className="glass-card rounded-xl p-4 space-y-3 animate-pulse">
      <div className="h-4 w-3/4 rounded-md bg-muted" />
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-5/6 rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-md bg-muted/70" />
        <div className="h-5 w-20 rounded-md bg-muted/70" />
      </div>
    </div>
  );
}
