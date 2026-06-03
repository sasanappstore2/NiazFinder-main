'use client';

import type { BrandAtmosphereTokens } from '@/lib/color/brand-atmosphere';
import { cn } from '@/lib/utils';

/**
 * Subtle full-page brand atmosphere (red + gray from logo) — no stripe aurora.
 */
export function BrandAuraBackdrop({
  tokens,
  className,
}: {
  tokens: BrandAtmosphereTokens;
  className?: string;
}) {
  return (
    <div className={cn('brand-atmosphere', className)} aria-hidden>
      <div className="brand-atmosphere__base" />
      <div className="brand-atmosphere__glow brand-atmosphere__glow--neutral" />
      <div className="brand-atmosphere__glow brand-atmosphere__glow--accent" />
      <div className="brand-atmosphere__glow brand-atmosphere__glow--accent-secondary" />
    </div>
  );
}
