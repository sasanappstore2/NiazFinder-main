'use client';

import { useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { AnimateChangeInHeight } from '@/components/ui/filters';
import type { FilingBrowseFilters } from '@/lib/filing/apply-filing-filters';
import { toAsciiDigits } from '@/lib/format/digits';
import type { FilingRailFilterMeta } from './filing-filter-meta';

type Props = {
  meta: FilingRailFilterMeta;
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
};

export function FilingFilterPopover({
  meta,
  filters,
  onPatch,
  open,
  onOpenChange,
  trigger,
}: Props) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{trigger}</PopoverAnchor>
      <PopoverContent
        className="filing-filter-popover w-[min(18rem,calc(100vw-2rem))] p-0"
        align="start"
        dir="rtl"
      >
        <AnimateChangeInHeight>
          <FilingFilterPopoverBody
            meta={meta}
            filters={filters}
            onPatch={onPatch}
            onClose={() => onOpenChange(false)}
          />
        </AnimateChangeInHeight>
      </PopoverContent>
    </Popover>
  );
}

function FilingFilterPopoverBody({
  meta,
  filters,
  onPatch,
  onClose,
}: {
  meta: FilingRailFilterMeta;
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  onClose: () => void;
}) {
  switch (meta.kind) {
    case 'chips':
      return (
        <ChipsBody
          meta={meta}
          filters={filters}
          onPatch={onPatch}
          onClose={onClose}
          multi={meta.key === 'amenities'}
        />
      );
    case 'range':
      return <RangeBody meta={meta} filters={filters} onPatch={onPatch} onClose={onClose} />;
    case 'max':
      return <MaxBody meta={meta} filters={filters} onPatch={onPatch} onClose={onClose} />;
    case 'text':
      return <TextBody meta={meta} filters={filters} onPatch={onPatch} onClose={onClose} />;
    case 'date':
      return <DateBody meta={meta} filters={filters} onPatch={onPatch} onClose={onClose} />;
    default:
      return null;
  }
}

function ChipsBody({
  meta,
  filters,
  onPatch,
  onClose,
  multi,
}: {
  meta: FilingRailFilterMeta;
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  onClose: () => void;
  multi: boolean;
}) {
  const [commandInput, setCommandInput] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);
  const options = meta.options ?? [];
  const singleKey = meta.singleKey!;

  const selected = multi
    ? filters.amenities
    : [String(filters[singleKey] ?? '')].filter((v) => v && v !== 'all');

  const toggle = (value: string) => {
    if (multi) {
      const next = filters.amenities.includes(value)
        ? filters.amenities.filter((a) => a !== value)
        : [...filters.amenities, value];
      onPatch({ amenities: next });
      return;
    }
    const current = String(filters[singleKey] ?? '');
    onPatch({ [singleKey]: current === value ? (singleKey === 'propertyKind' || singleKey === 'posterKind' ? 'all' : '') : value } as Partial<FilingBrowseFilters>);
    onClose();
  };

  const selectedOptions = options.filter((o) => selected.includes(o.value));
  const unselectedOptions = options.filter((o) => !selected.includes(o.value));

  return (
    <Command>
      <CommandInput
        placeholder={meta.label}
        className="h-9"
        value={commandInput}
        onInputCapture={(e) => setCommandInput(e.currentTarget.value)}
        ref={commandInputRef}
      />
      <CommandList>
        <CommandEmpty>موردی یافت نشد.</CommandEmpty>
        {selectedOptions.length > 0 ? (
          <CommandGroup>
            {selectedOptions.map((opt) => (
              <CommandItem
                key={opt.value}
                className="flex items-center gap-2"
                onSelect={() => toggle(opt.value)}
              >
                <Checkbox checked />
                <span>{opt.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {unselectedOptions.length > 0 && selectedOptions.length > 0 ? <CommandSeparator /> : null}
        {unselectedOptions.length > 0 ? (
          <CommandGroup>
            {unselectedOptions.map((opt) => (
              <CommandItem
                key={opt.value}
                className="group flex items-center gap-2"
                value={opt.value}
                onSelect={() => toggle(opt.value)}
              >
                <Checkbox checked={false} className="opacity-0 group-data-[selected=true]:opacity-100" />
                <span>{opt.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </Command>
  );
}

function parseRangeBound(raw: string): number | null {
  const n = Number(toAsciiDigits(raw.trim()));
  return Number.isFinite(n) ? n : null;
}

function RangeBody({
  meta,
  filters,
  onPatch,
  onClose,
}: {
  meta: FilingRailFilterMeta;
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  onClose: () => void;
}) {
  const minKey = meta.minKey!;
  const maxKey = meta.maxKey!;
  const [min, setMin] = useState(String(filters[minKey] ?? ''));
  const [max, setMax] = useState(String(filters[maxKey] ?? ''));
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    setMin(String(filters[minKey] ?? ''));
    setMax(String(filters[maxKey] ?? ''));
    setRangeError(null);
  }, [filters, minKey, maxKey]);

  const apply = () => {
    const minN = parseRangeBound(min);
    const maxN = parseRangeBound(max);
    if (minN != null && maxN != null && minN > maxN) {
      setRangeError('حداقل باید کوچک‌تر از حداکثر باشد');
      return;
    }
    setRangeError(null);
    onPatch({ [minKey]: min, [maxKey]: max } as Partial<FilingBrowseFilters>);
    onClose();
  };

  const clear = () => {
    setMin('');
    setMax('');
    onPatch(meta.clearPatch());
    onClose();
  };

  return (
    <div className="filing-filter-popover__panel">
      <p className="filing-filter-popover__title">{meta.label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">از</Label>
          <PersianDigitInput variant="plain" placeholder="حداقل" value={min} onChange={setMin} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">تا</Label>
          <PersianDigitInput variant="plain" placeholder="حداکثر" value={max} onChange={setMax} />
        </div>
      </div>
      {rangeError ? <p className="text-xs text-destructive">{rangeError}</p> : null}
      <div className="filing-filter-popover__actions">
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          پاک کردن
        </Button>
        <Button type="button" size="sm" onClick={apply}>
          اعمال
        </Button>
      </div>
    </div>
  );
}

function MaxBody({
  meta,
  filters,
  onPatch,
  onClose,
}: {
  meta: FilingRailFilterMeta;
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  onClose: () => void;
}) {
  const key = meta.singleKey!;
  const [value, setValue] = useState(String(filters[key] ?? ''));

  useEffect(() => {
    setValue(String(filters[key] ?? ''));
  }, [filters, key]);

  const apply = () => {
    onPatch({ [key]: value } as Partial<FilingBrowseFilters>);
    onClose();
  };

  return (
    <div className="filing-filter-popover__panel">
      <p className="filing-filter-popover__title">{meta.label}</p>
      <PersianDigitInput
        variant="plain"
        placeholder="حداکثر (سال)"
        value={value}
        onChange={setValue}
      />
      <div className="filing-filter-popover__actions">
        <Button type="button" variant="outline" size="sm" onClick={() => { onPatch(meta.clearPatch()); onClose(); }}>
          پاک کردن
        </Button>
        <Button type="button" size="sm" onClick={apply}>
          اعمال
        </Button>
      </div>
    </div>
  );
}

function TextBody({
  meta,
  filters,
  onPatch,
  onClose,
}: {
  meta: FilingRailFilterMeta;
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  onClose: () => void;
}) {
  const key = meta.singleKey!;
  const [value, setValue] = useState(String(filters[key] ?? ''));

  useEffect(() => {
    setValue(String(filters[key] ?? ''));
  }, [filters, key]);

  const apply = () => {
    onPatch({ [key]: value } as Partial<FilingBrowseFilters>);
    onClose();
  };

  return (
    <div className="filing-filter-popover__panel">
      <p className="filing-filter-popover__title">{meta.label}</p>
      <PersianDigitInput variant="plain" placeholder="کد فایل" value={value} onChange={setValue} />
      <div className="filing-filter-popover__actions">
        <Button type="button" variant="outline" size="sm" onClick={() => { onPatch(meta.clearPatch()); onClose(); }}>
          پاک کردن
        </Button>
        <Button type="button" size="sm" onClick={apply}>
          اعمال
        </Button>
      </div>
    </div>
  );
}

function DateBody({
  meta,
  filters,
  onPatch,
  onClose,
}: {
  meta: FilingRailFilterMeta;
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  onClose: () => void;
}) {
  const key = meta.singleKey!;
  const [value, setValue] = useState(String(filters[key] ?? ''));

  useEffect(() => {
    setValue(String(filters[key] ?? ''));
  }, [filters, key]);

  const apply = () => {
    onPatch({ [key]: value } as Partial<FilingBrowseFilters>);
    onClose();
  };

  return (
    <div className="filing-filter-popover__panel">
      <p className="filing-filter-popover__title">{meta.label}</p>
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="filing-filter-popover__actions">
        <Button type="button" variant="outline" size="sm" onClick={() => { onPatch(meta.clearPatch()); onClose(); }}>
          پاک کردن
        </Button>
        <Button type="button" size="sm" onClick={apply}>
          اعمال
        </Button>
      </div>
    </div>
  );
}
