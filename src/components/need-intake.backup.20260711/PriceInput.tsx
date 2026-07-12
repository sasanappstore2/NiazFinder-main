'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  extractMoneyDigits,
  formatMoneyInputDisplay,
  parseMoneyInput,
} from '@/lib/format/money';

interface PriceInputProps {
  value: string | number | undefined;
  onChange: (value: number | '') => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PriceInput({ value, onChange, placeholder, disabled }: PriceInputProps) {
  const digitsFromProp =
    value !== undefined && value !== null && value !== ''
      ? extractMoneyDigits(String(value))
      : '';

  const [display, setDisplay] = useState(() => formatMoneyInputDisplay(digitsFromProp));

  useEffect(() => {
    const d =
      value !== undefined && value !== null && value !== ''
        ? extractMoneyDigits(String(value))
        : '';
    setDisplay(formatMoneyInputDisplay(d));
  }, [value]);

  const placeholderDisplay = placeholder
    ? formatMoneyInputDisplay(extractMoneyDigits(placeholder)) || placeholder
    : 'مثلاً ۵٬۰۰۰٬۰۰۰';

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      dir="ltr"
      value={display}
      disabled={disabled}
      placeholder={placeholderDisplay}
      className="h-12 text-body text-left tabular-nums tracking-wide"
      onChange={(e) => {
        const raw = extractMoneyDigits(e.target.value);
        setDisplay(formatMoneyInputDisplay(raw));
        if (!raw) {
          onChange('');
          return;
        }
        const parsed = parseMoneyInput(raw);
        if (parsed !== null) onChange(parsed);
      }}
    />
  );
}
