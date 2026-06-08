'use client';

import { cn } from '@/lib/utils';

export function MapPinMarker({
  selected,
  verified,
  approximate,
  color,
  className,
}: {
  selected?: boolean;
  verified?: boolean;
  /** Non-exact neighborhood placement (no user map pin). */
  approximate?: boolean;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bm-pin',
        selected && 'bm-pin--selected',
        verified && 'bm-pin--verified',
        approximate && 'bm-pin--approximate',
        className
      )}
      style={
        color
          ? ({ ['--pin-color' as string]: color, background: color } as React.CSSProperties)
          : undefined
      }
      aria-hidden
    />
  );
}

export function MapClusterMarker({ count }: { count: number }) {
  const large = count >= 50;
  return (
    <div className={cn('bm-cluster', large && 'bm-cluster--lg')} aria-hidden>
      {count.toLocaleString('fa-IR')}
    </div>
  );
}
