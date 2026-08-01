'use client';

import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IntakeSeamlessLoaderProps {
  className?: string;
}

/** Branded loading overlay for home → /post seamless handoff (phase 24). */
export function IntakeSeamlessLoader({ className }: IntakeSeamlessLoaderProps) {
  return (
    <div
      className={cn('intake-seamless-loader', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="intake-seamless-loader__glow" aria-hidden />
      <div className="intake-seamless-loader__icon-wrap">
        <Sparkles className="size-5 text-primary" aria-hidden />
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      </div>
      <p className="intake-seamless-loader__title">در حال تحلیل نیاز</p>
      <p className="intake-seamless-loader__hint">
        فرم آماده است؛ فیلدها در پس‌زمینه به‌روز می‌شوند
      </p>
    </div>
  );
}
