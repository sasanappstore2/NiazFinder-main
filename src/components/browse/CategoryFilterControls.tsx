'use client';

import { useState } from 'react';
import { BrowseFilterPill } from './BrowseFilterPill';
import type { CategoryFilterField } from '@/config/category-filters/types';
import type { BrowseFilters } from '@/lib/filters/parser';
import { getAttribute } from '@/lib/filters/parser';
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
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { toAsciiDigits } from '@/lib/format/digits';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RECENT_OPTIONS, SORT_OPTIONS_BUSINESS, SORT_OPTIONS_NEED } from '@/config/browse-filter-definitions';

interface CategoryFilterControlsProps {
  fields: CategoryFilterField[];
  filters: BrowseFilters;
  isBusiness: boolean;
  onPatchGlobal: (patch: Partial<BrowseFilters>) => void;
  onPatchAttributes: (patch: Record<string, string | null | undefined>) => void;
  /** Answers used for showIf (current attribute + global dealType). */
  context?: Record<string, string>;
}

function visibleField(
  field: CategoryFilterField,
  ctx: Record<string, string>
): boolean {
  if (!field.showIf) return true;
  const val = ctx[field.showIf.field] ?? '';
  if (field.showIf.equals != null) return val === field.showIf.equals;
  if (field.showIf.in) return field.showIf.in.includes(val);
  return true;
}

export function CategoryFilterControls({
  fields,
  filters,
  isBusiness,
  onPatchGlobal,
  onPatchAttributes,
  context: contextProp,
}: CategoryFilterControlsProps) {
  const ctx: Record<string, string> = {
    ...filters.attributes,
    dealType: filters.attributes.dealType ?? '',
    ...contextProp,
  };

  const categoryFields = fields.filter(
    (f) => !f.globalKey && visibleField(f, ctx)
  );

  return (
    <>
      {categoryFields.map((field) => (
        <CategoryFieldControl
          key={field.key}
          field={field}
          filters={filters}
          onPatchAttributes={onPatchAttributes}
        />
      ))}

      {fields.some((f) => f.globalKey === 'recent') && (
        <RecentControl filters={filters} onPatchGlobal={onPatchGlobal} />
      )}

      {/* Sort surfaces in the bar only when it differs from the default — the
          default ("جدیدترین"/"rating") would just clutter the row and force an
          awkward wrap. Default sort is always available inside the filter sheet. */}
      {fields.some((f) => f.globalKey === 'sort') &&
        filters.sort !== (isBusiness ? 'rating' : 'newest') && (
          <SortControl filters={filters} isBusiness={isBusiness} onPatchGlobal={onPatchGlobal} />
        )}
    </>
  );
}

function CategoryFieldControl({
  field,
  filters,
  onPatchAttributes,
}: {
  field: CategoryFilterField;
  filters: BrowseFilters;
  onPatchAttributes: (patch: Record<string, string | null | undefined>) => void;
}) {
  const [open, setOpen] = useState(false);
  const value = getAttribute(filters, field.key);

  if (field.kind === 'toggle') {
    const active = value === 'true';
    return (
      <BrowseFilterPill
        label={field.label}
        active={active}
        onClick={() => onPatchAttributes({ [field.key]: active ? null : 'true' })}
      />
    );
  }

  if (field.kind === 'chips' || field.kind === 'select' || field.kind === 'multi') {
    const label = field.options?.find((o) => o.value === value)?.label ?? field.label;
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <span>
            <BrowseFilterPill
              label={value ? label : field.label}
              active={Boolean(value)}
              showChevron
              onClear={value ? () => onPatchAttributes({ [field.key]: null }) : undefined}
            />
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" align="start" dir="rtl">
          <Select
            value={value ?? 'all'}
            onValueChange={(v) => {
              onPatchAttributes({ [field.key]: v === 'all' ? null : v });
              setOpen(false);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {(field.options ?? []).map((o) => (
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

  if (field.kind === 'range') {
    const minKey = field.key.endsWith('Max') ? field.key.replace('Max', 'Min') : field.key.includes('Min') ? field.key : `${field.key}Min`;
    const maxKey = field.key.endsWith('Min') ? field.key.replace('Min', 'Max') : field.key.includes('Max') ? field.key : `${field.key}Max`;
    const minVal = getAttribute(filters, minKey);
    const maxVal = getAttribute(filters, maxKey);
    const active = Boolean(minVal || maxVal);
    const display =
      minVal && maxVal
        ? `${minVal} – ${maxVal}`
        : minVal
          ? `از ${minVal}`
          : maxVal
            ? `تا ${maxVal}`
            : field.label;

    return (
      <RangePopover
        label={display}
        fieldLabel={field.label}
        active={active}
        open={open}
        setOpen={setOpen}
        onApply={(min, max) => {
          onPatchAttributes({
            [minKey]: min || null,
            [maxKey]: max || null,
          });
        }}
        onClear={() => onPatchAttributes({ [minKey]: null, [maxKey]: null })}
      />
    );
  }

  return null;
}

function RangePopover({
  label,
  fieldLabel,
  active,
  open,
  setOpen,
  onApply,
  onClear,
}: {
  label: string;
  fieldLabel: string;
  active: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  onApply: (min: string, max: string) => void;
  onClear: () => void;
}) {
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
      }}
    >
      <PopoverTrigger asChild>
        <span>
          <BrowseFilterPill
            label={active ? label : fieldLabel}
            active={active}
            showChevron
            onClear={active ? onClear : undefined}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start" dir="rtl">
        <div className="space-y-3">
          <Label>{fieldLabel}</Label>
          <div className="grid grid-cols-2 gap-2">
            <PersianDigitInput variant="plain" placeholder="از" value={min} onChange={setMin} />
            <PersianDigitInput variant="plain" placeholder="تا" value={max} onChange={setMax} />
          </div>
          <Button size="sm" className="w-full" onClick={() => { onApply(min, max); setOpen(false); }}>
            اعمال
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RecentControl({
  filters,
  onPatchGlobal,
}: {
  filters: BrowseFilters;
  onPatchGlobal: (patch: Partial<BrowseFilters>) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    RECENT_OPTIONS.find((o) => o.value === (filters.recent ?? ''))?.label ?? 'بازه زمانی';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <BrowseFilterPill
            label={label}
            active={Boolean(filters.recent)}
            showChevron
            onClear={filters.recent ? () => onPatchGlobal({ recent: null }) : undefined}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="start" dir="rtl">
        {RECENT_OPTIONS.map((o) => (
          <button
            key={o.value || 'all'}
            type="button"
            className="flex w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              onPatchGlobal({
                recent: o.value ? (o.value as BrowseFilters['recent']) : null,
              });
              setOpen(false);
            }}
          >
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function SortControl({
  filters,
  isBusiness,
  onPatchGlobal,
}: {
  filters: BrowseFilters;
  isBusiness: boolean;
  onPatchGlobal: (patch: Partial<BrowseFilters>) => void;
}) {
  const [open, setOpen] = useState(false);
  const sortOptions = isBusiness ? SORT_OPTIONS_BUSINESS : SORT_OPTIONS_NEED;
  const sortLabel =
    sortOptions.find((o) => o.value === filters.sort)?.label ?? 'جدیدترین';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <BrowseFilterPill label={sortLabel} active={filters.sort !== 'newest'} showChevron />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="start" dir="rtl">
        {sortOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            className="flex w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              onPatchGlobal({ sort: o.value as BrowseFilters['sort'] });
              setOpen(false);
            }}
          >
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Global browse controls (price, photo, verified, urgent). */
export function GlobalBrowseControls({
  fields,
  filters,
  onPatchGlobal,
}: {
  fields: CategoryFilterField[];
  filters: BrowseFilters;
  onPatchGlobal: (patch: Partial<BrowseFilters>) => void;
}) {
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceMinDraft, setPriceMinDraft] = useState('');
  const [priceMaxDraft, setPriceMaxDraft] = useState('');
  const hasPrice = filters.priceMin != null || filters.priceMax != null;

  const openPrice = (v: boolean) => {
    if (v) {
      setPriceMinDraft(filters.priceMin != null ? String(filters.priceMin) : '');
      setPriceMaxDraft(filters.priceMax != null ? String(filters.priceMax) : '');
    }
    setPriceOpen(v);
  };

  return (
    <>
      {fields.some((f) => f.globalKey === 'price') && (
        <Popover open={priceOpen} onOpenChange={openPrice}>
          <PopoverTrigger asChild>
            <span>
              <BrowseFilterPill
                label={
                  hasPrice
                    ? filters.priceMin != null && filters.priceMax != null
                      ? `${filters.priceMin} – ${filters.priceMax}`
                      : filters.priceMax != null
                        ? `تا ${filters.priceMax}`
                        : `از ${filters.priceMin}`
                    : 'قیمت'
                }
                active={hasPrice}
                showChevron
                onClear={
                  hasPrice
                    ? () => onPatchGlobal({ priceMin: null, priceMax: null })
                    : undefined
                }
              />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start" dir="rtl">
            <div className="space-y-3">
              <Label>قیمت / بودجه (تومان)</Label>
              <div className="grid grid-cols-2 gap-2">
                <PersianDigitInput
                  variant="plain"
                  placeholder="از"
                  value={priceMinDraft}
                  onChange={setPriceMinDraft}
                />
                <PersianDigitInput
                  variant="plain"
                  placeholder="تا"
                  value={priceMaxDraft}
                  onChange={setPriceMaxDraft}
                />
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  onPatchGlobal({
                    priceMin: priceMinDraft ? Number(toAsciiDigits(priceMinDraft)) : null,
                    priceMax: priceMaxDraft ? Number(toAsciiDigits(priceMaxDraft)) : null,
                  });
                  setPriceOpen(false);
                }}
              >
                اعمال
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {fields.some((f) => f.globalKey === 'hasPhoto') && (
        <BrowseFilterPill
          label="عکس‌دار"
          active={filters.hasPhoto === true}
          onClick={() => onPatchGlobal({ hasPhoto: filters.hasPhoto ? null : true })}
        />
      )}

      {fields.some((f) => f.globalKey === 'urgent') && (
        <BrowseFilterPill
          label="فوری"
          active={filters.urgent === true}
          onClick={() => onPatchGlobal({ urgent: filters.urgent ? null : true })}
        />
      )}

      {fields.some((f) => f.globalKey === 'verified') && (
        <BrowseFilterPill
          label="تأییدشده"
          active={filters.verified === true}
          onClick={() => onPatchGlobal({ verified: filters.verified ? null : true })}
        />
      )}
    </>
  );
}
