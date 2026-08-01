'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { BorderGlow } from '@/components/ui/border-glow';
import { cn } from '@/lib/utils';

export interface OptionTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  selected?: boolean;
  /** Show border-glow spotlight on hover / when selected. */
  glow?: boolean;
}

/**
 * Bordered stack option (forms, filters, intake disambiguation).
 */
export function OptionTile({
  children,
  selected = false,
  glow = true,
  className,
  type = 'button',
  ...props
}: OptionTileProps) {
  return (
    <BorderGlow
      rounded="lg"
      glow={glow}
      size={96}
      className={cn(
        'w-full transition-shadow',
        selected && 'shadow-[0_0_24px_-10px_oklch(var(--primary)/0.45)]',
      )}
      innerClassName="p-0"
      spotlightClassName={selected ? 'opacity-60' : undefined}
    >
      <button
        type={type}
        aria-pressed={selected}
        className={cn(
          'flex min-h-11 w-full items-center justify-start rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50',
          selected
            ? 'bg-primary/10 text-primary'
            : 'bg-background text-foreground hover:bg-muted/40',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </BorderGlow>
  );
}
