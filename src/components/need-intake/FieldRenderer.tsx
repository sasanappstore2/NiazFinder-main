'use client';

import type { FieldSchema } from '@/contracts/need-intake';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SuggestionChips } from './SuggestionChips';
import { PriceInput } from './PriceInput';

interface FieldRendererProps {
  field: FieldSchema;
  value: string | number | boolean | string[] | undefined;
  onChange: (value: string | number | string[]) => void;
  onChipSelect?: (value: string) => void;
  disabled?: boolean;
}

export function FieldRenderer({
  field,
  value,
  onChange,
  onChipSelect,
  disabled,
}: FieldRendererProps) {
  if ((field.type === 'chips' || field.type === 'multi_select') && field.options) {
    const isMulti = field.type === 'multi_select';
    const chipValue = isMulti
      ? Array.isArray(value)
        ? value
        : typeof value === 'string' && value.trim()
          ? value.split(',').map((v) => v.trim()).filter(Boolean)
          : []
      : String(value ?? '');

    return (
      <SuggestionChips
        options={field.options}
        value={chipValue}
        multiple={isMulti}
        disabled={disabled}
        onSelect={(v) => {
          onChange(v);
          if (!isMulti && typeof v === 'string') onChipSelect?.(v);
        }}
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className="min-h-[100px] text-base"
      />
    );
  }

  if (field.type === 'price') {
    return (
      <PriceInput
        value={value as string | number | undefined}
        onChange={onChange}
        placeholder={field.placeholder}
        disabled={disabled}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <Input
        type="number"
        inputMode="numeric"
        value={value != null ? String(value) : ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        placeholder={field.placeholder}
        disabled={disabled}
        className="h-12 text-base"
      />
    );
  }

  return (
    <Input
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      className="h-12 text-base"
    />
  );
}
