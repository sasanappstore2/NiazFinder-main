'use client';

import type { ReactNode } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrowseFilterPillProps {
  label: ReactNode;
  active?: boolean;
  onClick?: () => void;
  onClear?: () => void;
  showChevron?: boolean;
  className?: string;
  /**
   * 'trigger' renders the leading "filters" command button — the single
   * highest-weight element in the bar (solid emerald when filters are active,
   * a clear bordered control when idle). 'default' is a quiet quick-filter chip.
   */
  variant?: 'default' | 'trigger';
  /** Count badge (used by the trigger to show the active-filter count). */
  badge?: ReactNode;
}

const PILL_BASE =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 min-h-11 text-[13px] font-medium ' +
  'transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] ' +
  'touch-target-min outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-1 ' +
  'focus-visible:ring-offset-background';

function pillClasses(variant: 'default' | 'trigger', active: boolean, className?: string): string {
  return cn(
    PILL_BASE,
    variant === 'trigger'
      ? active
        ? 'border-transparent bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90'
        : 'border-border/70 bg-background text-foreground hover:border-primary/45 hover:text-primary'
      : active
        ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
        : 'border-border/60 bg-background/80 text-muted-foreground hover:border-border hover:text-foreground',
    className
  );
}

function CountBadge({ children, onPrimary }: { children: ReactNode; onPrimary: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums',
        onPrimary ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary text-primary-foreground'
      )}
    >
      {children}
    </span>
  );
}

export function BrowseFilterPill({
  label,
  active = false,
  onClick,
  onClear,
  showChevron = false,
  className,
  variant = 'default',
  badge,
}: BrowseFilterPillProps) {
  // Active + clearable: a chip carrying its own inline clear-X (e.g. selected
  // category / neighborhood / price). Never used by the trigger.
  if (active && onClear) {
    return (
      <div className={pillClasses(variant, active, className)}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="-ms-1.5 -my-2 inline-flex size-8 items-center justify-center rounded-full transition-colors hover:bg-primary/20"
          aria-label="حذف فیلتر"
        >
          <X className="size-3.5" />
        </button>
        <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5">
          <span className="whitespace-nowrap">{label}</span>
          {showChevron && <ChevronDown className="size-3 opacity-60" />}
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={pillClasses(variant, active, className)}>
      <span className="whitespace-nowrap">{label}</span>
      {badge != null && <CountBadge onPrimary={variant === 'trigger' && active}>{badge}</CountBadge>}
      {showChevron && <ChevronDown className="size-3 opacity-60" />}
    </button>
  );
}
