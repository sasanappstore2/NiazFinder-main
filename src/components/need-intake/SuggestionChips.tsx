'use client';

import type { FieldOption } from '@/contracts/need-intake';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  options: FieldOption[];
  value?: string | string[];
  multiple?: boolean;
  onSelect: (value: string | string[]) => void;
  disabled?: boolean;
  className?: string;
}

function normalizeSelected(value: string | string[] | undefined, multiple: boolean): Set<string> {
  if (multiple) {
    if (Array.isArray(value)) return new Set(value.map((v) => v.trim()).filter(Boolean));
    if (typeof value === 'string' && value.trim()) {
      return new Set(
        value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      );
    }
    return new Set();
  }
  const single = Array.isArray(value) ? value[0] : value;
  return new Set(single?.trim() ? [single.trim()] : []);
}

export function SuggestionChips({
  options,
  value,
  multiple = false,
  onSelect,
  disabled,
  className,
}: SuggestionChipsProps) {
  const selectedSet = normalizeSelected(value, multiple);

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const active = selectedSet.has(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (multiple) {
                const next = new Set(selectedSet);
                if (active) next.delete(opt.value);
                else next.add(opt.value);
                onSelect(Array.from(next));
                return;
              }
              onSelect(active ? '' : opt.value);
            }}
            className={cn(
              'min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              'disabled:opacity-50',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card hover:border-primary hover:bg-primary/5'
            )}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
