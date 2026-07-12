'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type EmptyStateVariant = 'default' | 'filtered' | 'error';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  variant?: EmptyStateVariant;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

const VARIANT_ICON: Record<EmptyStateVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  filtered: 'bg-muted/80 text-muted-foreground',
  error: 'bg-destructive/10 text-destructive',
};

const VARIANT_CONTAINER: Record<EmptyStateVariant, string> = {
  default: 'border-border/60 bg-background',
  filtered: 'border-dashed border-border/60 bg-muted/10',
  error: 'border-destructive/30 bg-destructive/5',
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  variant = 'default',
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const showAction = Boolean(actionLabel && onAction);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border px-6 py-12 text-center',
        VARIANT_CONTAINER[variant],
        className
      )}
    >
      <div
        className={cn(
          'mb-4 flex size-16 items-center justify-center rounded-2xl',
          VARIANT_ICON[variant]
        )}
      >
        <Icon className="size-8" aria-hidden />
      </div>
      <h2 className="text-h3 font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-body-sm text-muted-foreground">{description}</p>
      ) : null}
      {showAction ? (
        <Button type="button" size="touch" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
