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
import type { useFilingsExplorerFilters } from './useFilingsExplorerFilters';
import {
  FILINGS_FILE_TYPE_OPTIONS,
  FILINGS_POSTER_KIND_OPTIONS,
} from './useFilingsExplorerFilters';

type Explorer = ReturnType<typeof useFilingsExplorerFilters>;

function SelectFilterPill({
  fieldLabel,
  value,
  options,
  allLabel = 'همه',
  onChange,
}: {
  fieldLabel: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
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
          <SelectTrigger className="h-9">
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

function AreaRangePill({ explorer }: { explorer: Explorer }) {
  const { filters, patch } = explorer;
  const [open, setOpen] = useState(false);
  const [minDraft, setMinDraft] = useState('');
  const [maxDraft, setMaxDraft] = useState('');

  const active = Boolean(filters.areaMin || filters.areaMax);
  const label = active
    ? filters.areaMin && filters.areaMax
      ? `${filters.areaMin} – ${filters.areaMax}`
      : filters.areaMin
        ? `از ${filters.areaMin}`
        : `تا ${filters.areaMax}`
    : 'متراژ';

  const openPopover = (v: boolean) => {
    if (v) {
      setMinDraft(filters.areaMin);
      setMaxDraft(filters.areaMax);
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
            onClear={active ? () => patch({ areaMin: '', areaMax: '' }) : undefined}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start" dir="rtl">
        <div className="space-y-3">
          <Label>متراژ (متر مربع)</Label>
          <div className="grid grid-cols-2 gap-2">
            <PersianDigitInput variant="plain" placeholder="از" value={minDraft} onChange={setMinDraft} />
            <PersianDigitInput variant="plain" placeholder="تا" value={maxDraft} onChange={setMaxDraft} />
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              patch({ areaMin: minDraft, areaMax: maxDraft });
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

function InsertedDatePill({ explorer }: { explorer: Explorer }) {
  const { filters, patch } = explorer;
  const [open, setOpen] = useState(false);
  const active = Boolean(filters.insertedDate);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <BrowseFilterPill
            label={active ? filters.insertedDate : 'تاریخ درج'}
            active={active}
            showChevron
            onClear={active ? () => patch({ insertedDate: '' }) : undefined}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start" dir="rtl">
        <div className="space-y-2">
          <Label>تاریخ درج</Label>
          <Input
            type="date"
            value={filters.insertedDate}
            onChange={(e) => patch({ insertedDate: e.target.value })}
            className="h-9"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FilingsExplorerQuickFilters({ explorer }: { explorer: Explorer }) {
  const { filters, patch, options, dealTypeOptions, propertyKindOptions } = explorer;

  return (
    <>
      <SelectFilterPill
        fieldLabel="منبع"
        value={filters.fileType}
        options={FILINGS_FILE_TYPE_OPTIONS.filter((o) => o.value !== 'all')}
        allLabel="همه منابع"
        onChange={(fileType) => patch({ fileType: fileType as typeof filters.fileType })}
      />

      <SelectFilterPill
        fieldLabel="آگهی‌دهنده"
        value={filters.posterKind}
        options={FILINGS_POSTER_KIND_OPTIONS.filter((o) => o.value !== 'all')}
        allLabel="همه"
        onChange={(posterKind) => patch({ posterKind: posterKind as typeof filters.posterKind })}
      />

      <SelectFilterPill
        fieldLabel="منطقه"
        value={filters.region}
        options={options.regions.map((r) => ({ value: r, label: r }))}
        allLabel="همه مناطق"
        onChange={(region) => patch({ region })}
      />

      <SelectFilterPill
        fieldLabel="نوع واگذاری"
        value={filters.dealType}
        options={dealTypeOptions}
        onChange={(dealType) => patch({ dealType })}
      />

      <SelectFilterPill
        fieldLabel="نوع ملک"
        value={filters.propertyKind}
        options={propertyKindOptions}
        onChange={(propertyKind) => patch({ propertyKind })}
      />

      <AreaRangePill explorer={explorer} />

      <InsertedDatePill explorer={explorer} />
    </>
  );
}
