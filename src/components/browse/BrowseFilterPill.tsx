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
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-rose-500/70 bg-rose-500/10 text-rose-600 dark:text-rose-400'
          : 'border-border/60 bg-background/80 text-muted-foreground hover:border-border hover:text-foreground',
        className
      )}
    >
      {onClear && active && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              onClear();
            }
          }}
          className="rounded-full p-0.5 hover:bg-rose-500/20"
          aria-label="حذف فیلتر"
        >
          <X className="size-3" />
        </span>
      )}
      <span className="whitespace-nowrap">{label}</span>
      {showChevron && <ChevronDown className="size-3 opacity-60" />}
    </button>
  );
}
