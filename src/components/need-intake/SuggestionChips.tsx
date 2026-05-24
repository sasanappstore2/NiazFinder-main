'use client';

import type { FieldOption } from '@/contracts/need-intake';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  options: FieldOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SuggestionChips({
  options,
  onSelect,
  disabled,
  className,
}: SuggestionChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(opt.value)}
          className={cn(
            'min-h-11 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium',
            'transition-colors hover:border-primary hover:bg-primary/5',
            'disabled:opacity-50'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
