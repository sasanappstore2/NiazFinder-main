'use client';

import type { FieldOption } from '@/contracts/need-intake';
import { BorderGlow } from '@/components/ui/border-glow';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  options: FieldOption[];
  value?: string | string[];
  multiple?: boolean;
  onSelect: (value: string | string[]) => void;
  disabled?: boolean;
  className?: string;
  /** Border-glow on active chip (and hover via spotlight). */
  glow?: boolean;
}

function normalizeSelected(value: string | string[] | undefined, multiple: boolean): Set<string> {
  if (multiple) {
    if (Array.isArray(value)) return new Set(value.map((v) => v.trim()).filter(Boolean));
    if (typeof value === 'string' && value.trim()) {
      return new Set(
        value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
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
  glow = true,
}: SuggestionChipsProps) {
  const selectedSet = normalizeSelected(value, multiple);

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const active = selectedSet.has(opt.value);

        const chipButton = (
          <button
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
              'min-h-11 w-full rounded-full px-4 py-2 text-sm font-medium transition-colors',
              'disabled:opacity-50',
              active
                ? 'bg-primary/10 text-primary'
                : 'bg-background text-foreground hover:bg-muted/40',
              !glow &&
                (active
                  ? 'border border-primary'
                  : 'border border-border hover:border-primary/40'),
            )}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );

        if (!glow) {
          return (
            <div key={opt.value} className="inline-flex">
              {chipButton}
            </div>
          );
        }

        return (
          <BorderGlow
            key={opt.value}
            rounded="full"
            glow
            size={88}
            className={cn('inline-flex', active && 'shadow-[0_0_20px_-8px_oklch(var(--primary)/0.4)]')}
            innerClassName="p-0"
          >
            {chipButton}
          </BorderGlow>
        );
      })}
    </div>
  );
}
