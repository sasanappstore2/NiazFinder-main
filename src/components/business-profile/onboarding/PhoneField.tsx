'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isolatePhoneDisplay } from '@/lib/chat/contact-share';

/** Iran mobile input — keeps 09… display, normalizes on blur. */
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
  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    onChange(digits);
  };

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
        <span className="flex items-center border-e border-border/80 bg-muted/50 px-3 text-sm font-medium text-muted-foreground">
          +98
        </span>
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="tel"
          placeholder="9123456789"
          value={value.replace(/^0/, '')}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => {
            const d = value.replace(/\D/g, '');
            if (d.length === 10 && d.startsWith('9')) onChange(`0${d}`);
            else if (d.length === 11 && d.startsWith('09')) onChange(d);
          }}
          className="border-0 font-mono shadow-none focus-visible:ring-0"
        />
      </div>
      {value.trim() && !error && (
        <p className="text-xs text-muted-foreground" dir="ltr">
          {isolatePhoneDisplay(value.startsWith('0') ? value : value ? `0${value}` : '')}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
