'use client';

import { useId, type ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface SwitchWithIconProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Shown when switch is on (inline in label, like shadcn demo) */
  iconOn: ReactNode;
  /** Shown when switch is off */
  iconOff: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Switch + label with inline icon — matches shadcn «with-icon» layout. */
export function SwitchWithIcon({
  checked,
  onCheckedChange,
  title,
  description,
  iconOn,
  iconOff,
  disabled,
  id: idProp,
  className,
}: SwitchWithIconProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 px-4 py-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
        />
        <Label
          htmlFor={id}
          className="cursor-pointer flex flex-1 items-center gap-1.5 text-sm font-medium"
        >
          <span className="min-w-0">{title}</span>
          <span className="shrink-0 text-muted-foreground" aria-hidden>
            {checked ? iconOn : iconOff}
          </span>
        </Label>
      </div>
      {description ? (
        <p className="mt-2 pr-[3.25rem] text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
