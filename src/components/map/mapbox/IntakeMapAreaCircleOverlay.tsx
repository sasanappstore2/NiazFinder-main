'use client';

import { INTAKE_AREA_CIRCLE_RADIUS_RATIO } from '@/lib/map/intake-area-circle';
import { cn } from '@/lib/utils';

/** Fixed on-screen search disc — map pans underneath (Divar-style intake picker). */
export function IntakeMapAreaCircleOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn('intake-map-area-circle-overlay', className)}
      style={
        {
          '--intake-area-circle-ratio': INTAKE_AREA_CIRCLE_RADIUS_RATIO,
        } as Record<string, string | number>
      }
      aria-hidden
    >
      <div className="intake-map-area-circle-overlay__disc" />
      <div className="intake-map-area-circle-overlay__dot" />
    </div>
  );
}
