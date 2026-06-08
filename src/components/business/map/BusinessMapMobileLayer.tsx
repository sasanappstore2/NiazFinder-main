'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/**
 * Full-screen mobile map layer. Portaled to `document.body` so sheet/overflow/transform
 * ancestors cannot zero-out fixed layout.
 */
export function BusinessMapMobileLayer({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        'business-map-mobile pointer-events-auto fixed inset-x-0 bottom-0 z-40 w-full',
        className
      )}
      style={{
        top: 'var(--site-header-offset, 6.5rem)',
        height: 'calc(100dvh - var(--site-header-offset, 6.5rem))',
        ...style,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
