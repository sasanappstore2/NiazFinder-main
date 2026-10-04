'use client';

import { Power, PowerOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnOffToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Dual-icon on/off toggle (ThemeToggle pattern) for launch / power controls.
 */
export function OnOffToggle({
  checked,
  onCheckedChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: OnOffToggleProps) {
  return (
    <div
      dir="ltr"
      className={cn(
        'flex h-8 w-16 cursor-pointer rounded-full border p-1 transition-all duration-300',
        checked
          ? 'border-emerald-700/60 bg-emerald-950'
          : 'border-zinc-700 bg-zinc-950',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      onClick={() => {
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={disabled ? -1 : 0}
    >
      <div className="flex w-full items-center justify-between">
        <div
          className={cn(
            'flex size-6 items-center justify-center rounded-full transition-transform duration-300',
            checked
              ? 'translate-x-0 bg-emerald-700'
              : 'translate-x-8 bg-zinc-700'
          )}
        >
          {checked ? (
            <Power className="size-3.5 text-white" strokeWidth={1.5} />
          ) : (
            <PowerOff className="size-3.5 text-zinc-200" strokeWidth={1.5} />
          )}
        </div>
        <div
          className={cn(
            'flex size-6 items-center justify-center rounded-full transition-transform duration-300',
            checked ? 'bg-transparent' : '-translate-x-8'
          )}
        >
          {checked ? (
            <PowerOff className="size-3.5 text-zinc-500" strokeWidth={1.5} />
          ) : (
            <Power className="size-3.5 text-zinc-400" strokeWidth={1.5} />
          )}
        </div>
      </div>
    </div>
  );
}
