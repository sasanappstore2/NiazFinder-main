'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  formatIranMobileDisplay,
  toAsciiDigits,
  toPersianDigits,
} from '@/lib/format/digits';

export type PersianDigitInputVariant = 'plain' | 'phone' | 'otp-cell';

export type PersianDigitInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type'
> & {
  /** ASCII digits only (0-9) */
  value: string;
  onChange: (ascii: string) => void;
  variant?: PersianDigitInputVariant;
};

function displayValue(variant: PersianDigitInputVariant, ascii: string): string {
  if (!ascii) return '';
  if (variant === 'phone') return formatIranMobileDisplay(ascii);
  return toPersianDigits(ascii);
}

function placeholderFor(
  variant: PersianDigitInputVariant,
  placeholder?: string
): string | undefined {
  if (!placeholder) {
    if (variant === 'phone') return toPersianDigits('09123456789');
    return undefined;
  }
  return toPersianDigits(placeholder);
}

export const PersianDigitInput = React.forwardRef<HTMLInputElement, PersianDigitInputProps>(
  function PersianDigitInput(
    {
      value,
      onChange,
      variant = 'plain',
      maxLength,
      className,
      placeholder,
      inputMode = 'numeric',
      dir = 'ltr',
      ...props
    },
    ref
  ) {
    const limit =
      maxLength ?? (variant === 'phone' ? 11 : variant === 'otp-cell' ? 1 : undefined);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let ascii = toAsciiDigits(e.target.value);
      if (limit != null) ascii = ascii.slice(0, limit);
      onChange(ascii);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={inputMode}
        dir={dir}
        autoComplete="off"
        value={displayValue(variant, value)}
        onChange={handleChange}
        placeholder={placeholderFor(variant, placeholder)}
        maxLength={variant === 'phone' ? undefined : maxLength}
        className={cn('font-sans tabular-nums', className)}
        {...props}
      />
    );
  }
);
