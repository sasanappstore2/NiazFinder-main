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
}

export function BrowseFilterPill({
  label,
  active = false,
  onClick,
  onClear,
  showChevron = false,
  className,
}: BrowseFilterPillProps) {
  const pillClass = cn(
    'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-2 min-h-11 text-xs font-medium transition-colors touch-target-min',
    active
      ? 'border-rose-500/70 bg-rose-500/10 text-rose-600 dark:text-rose-400'
      : 'border-border/60 bg-background/80 text-muted-foreground hover:border-border hover:text-foreground',
    className
  );

  if (active && onClear) {
    return (
      <div className={pillClass}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="rounded-full p-1 hover:bg-rose-500/20 touch-target-min"
          aria-label="حذف فیلتر"
        >
          <X className="size-3.5" />
        </button>
        <button type="button" onClick={onClick} className="inline-flex items-center gap-1">
          <span className="whitespace-nowrap">{label}</span>
          {showChevron && <ChevronDown className="size-3 opacity-60" />}
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={pillClass}>
      <span className="whitespace-nowrap">{label}</span>
      {showChevron && <ChevronDown className="size-3 opacity-60" />}
    </button>
  );
}
