import type { ReactNode } from 'react';
import { BorderGlow } from '@/components/ui/border-glow';
import { cn } from '@/lib/utils';

export interface PanelCardProps {
  children: ReactNode;
  className?: string;
  /** Render as section with optional aria-label */
  title?: string;
  padding?: 'default' | 'none' | 'sm';
  /** Mouse-following border glow (Magic UI spotlight shell). */
  glow?: boolean;
}

const PADDING: Record<NonNullable<PanelCardProps['padding']>, string> = {
  default: 'p-4 sm:p-6',
  sm: 'p-3 sm:p-4',
  none: '',
};

/**
 * Standard bordered panel for inbox-style pages (notifications, bookmarks, settings blocks).
 */
export function PanelCard({
  children,
  className,
  title,
  padding = 'default',
  glow = false,
}: PanelCardProps) {
  if (glow) {
    return (
      <BorderGlow
        rounded="xl"
        glow
        size={160}
        className={cn('shadow-sm', className)}
        innerClassName={cn(PADDING[padding])}
      >
        <section aria-label={title}>{children}</section>
      </BorderGlow>
    );
  }

  return (
    <section
      className={cn(
        'rounded-xl border border-border/60 bg-background shadow-sm',
        PADDING[padding],
        className,
      )}
      aria-label={title}
    >
      {children}
    </section>
  );
}
