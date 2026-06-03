'use client';

import { cn } from '@/lib/utils';

/**
 * Hero placeholder: aurora from logo accent + vivid color (hidden when cover image exists).
 */
export function HeroCoverAurora({ className }: { className?: string }) {
  return (
    <div className={cn('hero-cover-aurora', className)} aria-hidden>
      <div className="hero-cover-aurora__wash" />
      <div className="hero-cover-aurora__bands" />
      <div className="hero-cover-aurora__bands hero-cover-aurora__bands--slow" />
    </div>
  );
}
