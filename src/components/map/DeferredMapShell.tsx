'use client';

import type { ReactNode } from 'react';
import { useDeferMapUntilVisible } from '@/hooks/use-defer-map-until-visible';
import { cn } from '@/lib/utils';

type DeferredMapShellProps = {
  children: ReactNode;
  className?: string;
  placeholderClassName?: string;
  loadingLabel?: string;
  /** Skip intersection defer (e.g. fullscreen map the user explicitly opened). */
  eager?: boolean;
  /** Fraction of container visible before map init (0–1). */
  threshold?: number;
};

export function DeferredMapShell({
  children,
  className,
  placeholderClassName,
  loadingLabel = 'در حال بارگذاری نقشه…',
  eager = false,
  threshold = 0.15,
}: DeferredMapShellProps) {
  const { ref, mapReady } = useDeferMapUntilVisible<HTMLDivElement>({ threshold });
  const ready = eager || mapReady;

  return (
    <div ref={ref} className={cn('relative min-h-0', className)}>
      {ready ? (
        children
      ) : (
        <div
          className={cn(
            'flex h-full min-h-[200px] items-center justify-center bg-muted/30',
            placeholderClassName
          )}
          role="status"
          aria-live="polite"
        >
          <span className="text-sm text-muted-foreground">{loadingLabel}</span>
        </div>
      )}
    </div>
  );
}
