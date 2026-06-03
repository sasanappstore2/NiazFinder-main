'use client';

import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { cn } from '@/lib/utils';
import { isolatePhoneDisplay } from '@/lib/chat/contact-share';
import { normalizeIranMobile, toPersianDigits } from '@/lib/format/digits';

/** Iran mobile input — ASCII in state, Persian display, normalizes on blur. */
export function PhoneField({
  id,
  label,
  value,
  onChange,
  error,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  const displayStored = value.startsWith('0') ? value : value ? `0${value}` : '';

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium leading-none">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <div
        className={cn(
          'flex overflow-hidden rounded-lg border bg-background',
          error ? 'border-destructive' : 'border-input focus-within:ring-2 focus-within:ring-ring/30'
        )}
        dir="ltr"
      >
        <span className="flex items-center border-e border-border/80 bg-muted/50 px-3 text-sm font-medium text-muted-foreground persian-nums">
          {toPersianDigits('+98')}
        </span>
        <PersianDigitInput
          id={id}
          variant="plain"
          autoComplete="tel"
          placeholder={toPersianDigits('9123456789')}
          value={value.replace(/^0/, '')}
          onChange={(ascii) => onChange(ascii.slice(0, 11))}
          onBlur={() => {
            const normalized = normalizeIranMobile(value.startsWith('0') ? value : `0${value}`);
            if (normalized) onChange(normalized);
          }}
          className="border-0 font-sans tabular-nums shadow-none focus-visible:ring-0"
          maxLength={11}
        />
      </div>
      {displayStored.trim() && !error && (
        <p className="text-xs text-muted-foreground" dir="ltr">
          {isolatePhoneDisplay(displayStored)}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
