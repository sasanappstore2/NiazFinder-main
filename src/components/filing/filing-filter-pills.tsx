'use client';

import { useState } from 'react';
import { BrowseFilterPill } from '@/components/browse/BrowseFilterPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function FilingSelectFilterPill({
  fieldLabel,
  value,
  options,
  allLabel = 'همه',
  onChange,
}: {
  fieldLabel: string;
  value: string;
  options: { value: string; label: string }[];
  allLabel?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== 'all';
  const display =
    options.find((o) => o.value === value)?.label ?? (active ? value : fieldLabel);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <BrowseFilterPill
            label={active ? display : fieldLabel}
            active={active}
            showChevron
            onClear={active ? () => onChange('all') : undefined}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start" dir="rtl">
        <Select
          value={value}
          onValueChange={(v) => {
            onChange(v);
            setOpen(false);
          }}
        >
          <SelectTrigger className="h-9" aria-label={fieldLabel}>
            <SelectValue placeholder={allLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{allLabel}</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  );
}

export function FilingRangeFilterPill({
  fieldLabel,
  minValue,
  maxValue,
  unitLabel,
  onApply,
  onClear,
}: {
  fieldLabel: string;
  minValue: string;
  maxValue: string;
  unitLabel?: string;
  onApply: (min: string, max: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [minDraft, setMinDraft] = useState('');
  const [maxDraft, setMaxDraft] = useState('');

  const active = Boolean(minValue || maxValue);
  const label = active
    ? minValue && maxValue
      ? `${minValue} – ${maxValue}`
      : minValue
        ? `از ${minValue}`
        : `تا ${maxValue}`
    : fieldLabel;

  const openPopover = (v: boolean) => {
    if (v) {
      setMinDraft(minValue);
      setMaxDraft(maxValue);
    }
    setOpen(v);
  };

  return (
    <Popover open={open} onOpenChange={openPopover}>
      <PopoverTrigger asChild>
        <span>
          <BrowseFilterPill
            label={label}
            active={active}
            showChevron
            onClear={active ? onClear : undefined}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start" dir="rtl">
        <div className="space-y-3">
          <Label>
            {fieldLabel}
            {unitLabel ? ` (${unitLabel})` : ''}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <PersianDigitInput variant="plain" placeholder="از" value={minDraft} onChange={setMinDraft} />
            <PersianDigitInput variant="plain" placeholder="تا" value={maxDraft} onChange={setMaxDraft} />
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              onApply(minDraft, maxDraft);
              setOpen(false);
            }}
          >
            اعمال
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FilingDateFilterPill({
  fieldLabel,
  value,
  onChange,
}: {
  fieldLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = Boolean(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <BrowseFilterPill
            label={active ? value : fieldLabel}
            active={active}
            showChevron
            onClear={active ? () => onChange('') : undefined}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start" dir="rtl">
        <div className="space-y-2">
          <Label>{fieldLabel}</Label>
          <Input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
