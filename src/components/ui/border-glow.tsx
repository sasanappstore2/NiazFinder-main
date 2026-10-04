'use client';

import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import type { SpringOptions } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Spotlight } from '@/components/ui/spotlight';

export type BorderGlowRadius = 'md' | 'lg' | 'xl' | '2xl' | 'full';

const RADIUS_CLASS: Record<BorderGlowRadius, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export type BorderGlowProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  spotlightClassName?: string;
  size?: number;
  springOptions?: SpringOptions;
  rounded?: BorderGlowRadius;
  /** Disable cursor-following glow while keeping the border shell. */
  glow?: boolean;
};

/**
 * 1px border shell with optional mouse-following spotlight (Magic UI pattern).
 * Use for selectable options, bordered fields, and highlight panels.
 */
export function BorderGlow({
  children,
  className,
  innerClassName,
  spotlightClassName,
  size = 124,
  springOptions,
  rounded = 'xl',
  glow = true,
}: BorderGlowProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const radius = RADIUS_CLASS[rounded];
  const spotlightEnabled = glow && !reducedMotion;

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-border/35 p-px dark:bg-border/55',
        radius,
        className,
      )}
    >
      <Spotlight
        enabled={spotlightEnabled}
        size={size}
        springOptions={springOptions}
        className={cn(
          'from-primary/70 via-primary/45 to-primary/25 blur-2xl',
          'dark:from-primary/50 dark:via-primary/35 dark:to-primary/20',
          spotlightClassName,
        )}
      />
      <div className={cn('relative h-full w-full bg-background', radius, innerClassName)}>
        {children}
      </div>
    </div>
  );
}
