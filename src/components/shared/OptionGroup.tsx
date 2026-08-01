import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type OptionGroupLayout = 'stack' | 'chips';

export interface OptionGroupProps {
  children: ReactNode;
  layout?: OptionGroupLayout;
  label?: string;
  className?: string;
}

const LAYOUT_CLASS: Record<OptionGroupLayout, string> = {
  stack: 'flex flex-col gap-3',
  chips: 'flex flex-wrap gap-2',
};

/**
 * Consistent layout for radio/checkbox/switch lists or filter chips.
 * Prefer `OptionTile` children in stack layout for bordered glow options.
 */
export function OptionGroup({
  children,
  layout = 'stack',
  label,
  className,
}: OptionGroupProps) {
  return (
    <div
      className={cn('min-w-0', className)}
      role={layout === 'stack' ? 'group' : undefined}
      aria-label={label}
    >
      {label && layout === 'stack' ? (
        <p className="mb-2 text-body-sm font-medium text-foreground">{label}</p>
      ) : null}
      <div className={LAYOUT_CLASS[layout]}>{children}</div>
    </div>
  );
}
