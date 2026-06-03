'use client';

import { cn } from '@/lib/utils';
import type { BrandAuraColors } from '@/lib/color/extract-brand-colors';
import type { CSSProperties, ReactNode } from 'react';

export interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  showRadialGradient?: boolean;
  /** Logo / theme colors for the animated aurora bands */
  brandColors?: BrandAuraColors;
  /**
   * `page` — full-viewport demo/layout wrapper (optional children).
   * `layer` — fixed decorative backdrop only (business profile portal).
   */
  mode?: 'page' | 'layer';
}

export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
  brandColors,
  mode = 'page',
  style,
  ...props
}: AuroraBackgroundProps) {
  const brandStyle = (
    brandColors
      ? {
          '--brand-aura-a': brandColors.primary,
          '--brand-aura-b': brandColors.secondary,
          ...style,
        }
      : style
  ) as CSSProperties | undefined;

  const auroraRings = (
    <div
      className={cn(
        'pointer-events-none absolute -inset-[10px] opacity-50 will-change-transform',
        brandColors ? 'brand-aurora-rings' : 'aurora-rings-default',
        showRadialGradient && 'aurora-rings-masked'
      )}
      aria-hidden
    />
  );

  const auroraShell = (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {auroraRings}
    </div>
  );

  if (mode === 'layer') {
    return (
      <div
        className={cn('relative h-full w-full overflow-hidden', className)}
        style={brandStyle}
        {...props}
      >
        {auroraShell}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex min-h-[100vh] w-full flex-col items-center justify-center bg-background text-foreground transition-[background-color]',
        className
      )}
      style={brandStyle}
      {...props}
    >
      {auroraShell}
      {children ? <div className="relative z-10 w-full">{children}</div> : null}
    </div>
  );
}
