import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { BorderGlow } from '@/components/ui/border-glow';

export interface FieldStackProps {
  id?: string;
  label: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  /** `bordered` wraps the control in a spotlight border shell. */
  variant?: 'plain' | 'bordered';
}

/**
 * Standard form field layout: label above control, helper/error below.
 */
export function FieldStack({
  id,
  label,
  htmlFor,
  required = false,
  description,
  error,
  children,
  className,
  variant = 'plain',
}: FieldStackProps) {
  const fieldId = htmlFor ?? id;

  const control =
    variant === 'bordered' ? (
      <BorderGlow
        rounded="lg"
        glow
        size={112}
        innerClassName="p-0 [&_input]:border-0 [&_textarea]:border-0 [&_input]:shadow-none [&_textarea]:shadow-none"
      >
        {children}
      </BorderGlow>
    ) : (
      children
    );

  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={fieldId} className="text-body-sm font-medium">
        {label}
        {required ? (
          <span className="text-destructive ms-0.5" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {control}
      {error ? (
        <p className="text-caption text-destructive" role="alert">
          {error}
        </p>
      ) : description ? (
        <p className="text-caption text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
