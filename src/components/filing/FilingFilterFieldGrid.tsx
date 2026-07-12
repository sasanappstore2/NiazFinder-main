'use client';

import { Label } from '@/components/ui/label';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import type { FilingBrowseFilters } from '@/lib/filing/apply-filing-filters';
import { filingFilterSpecForDeal } from '@/config/filing-filters/specs';
import { FILING_AMENITY_OPTIONS, FILING_ROOMS_OPTIONS } from '@/config/filing-filters/options';
import type { FilingDealType } from '@/lib/filing-scrapers/listing-attribute-schema';
import { cn } from '@/lib/utils';

type Props = {
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  className?: string;
  /** Compact grid for expanded panel; default false uses sheet spacing */
  compact?: boolean;
};

function RangeField({
  label,
  minKey,
  maxKey,
  filters,
  onPatch,
}: {
  label: string;
  minKey: keyof FilingBrowseFilters;
  maxKey: keyof FilingBrowseFilters;
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <PersianDigitInput
          variant="plain"
          placeholder="از"
          value={String(filters[minKey] ?? '')}
          onChange={(d) => onPatch({ [minKey]: d } as Partial<FilingBrowseFilters>)}
        />
        <PersianDigitInput
          variant="plain"
          placeholder="تا"
          value={String(filters[maxKey] ?? '')}
          onChange={(d) => onPatch({ [maxKey]: d } as Partial<FilingBrowseFilters>)}
        />
      </div>
    </div>
  );
}

export function FilingFilterFieldGrid({ filters, onPatch, className, compact }: Props) {
  const deal = filters.dealType === 'all' ? 'all' : (filters.dealType as FilingDealType);
  const specKeys = new Set(filingFilterSpecForDeal(deal).map((f) => f.key));

  const toggleAmenity = (value: string) => {
    const next = filters.amenities.includes(value)
      ? filters.amenities.filter((a) => a !== value)
      : [...filters.amenities, value];
    onPatch({ amenities: next });
  };

  return (
    <div className={cn(compact ? 'space-y-4' : 'space-y-6', className)}>
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-foreground">شناسایی فایل</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {specKeys.has('fileCode') ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">کد فایل</Label>
              <PersianDigitInput
                variant="plain"
                placeholder="مثلاً ۵۲۵۸۳۷"
                value={filters.fileCode}
                onChange={(d) => onPatch({ fileCode: d })}
              />
            </div>
          ) : null}

          {specKeys.has('insertedDate') ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">تاریخ درج</Label>
              <input
                type="date"
                value={filters.insertedDate}
                onChange={(e) => onPatch({ insertedDate: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-foreground">مشخصات ملک</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {specKeys.has('areaMin') ? (
            <RangeField
              label="متراژ (متر)"
              minKey="areaMin"
              maxKey="areaMax"
              filters={filters}
              onPatch={onPatch}
            />
          ) : null}

          {specKeys.has('floorMin') ? (
            <RangeField
              label="طبقه"
              minKey="floorMin"
              maxKey="floorMax"
              filters={filters}
              onPatch={onPatch}
            />
          ) : null}

          {specKeys.has('buildingAgeMax') ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">حداکثر سن بنا (سال)</Label>
              <PersianDigitInput
                variant="plain"
                placeholder="مثلاً ۱۰"
                value={filters.buildingAgeMax}
                onChange={(d) => onPatch({ buildingAgeMax: d })}
              />
            </div>
          ) : null}

          {specKeys.has('rooms') ? (
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <Label className="text-[11px] text-muted-foreground">تعداد خواب</Label>
              <div className="flex flex-wrap gap-1.5">
                {FILING_ROOMS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onPatch({ rooms: filters.rooms === opt.value ? '' : opt.value })
                    }
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                      filters.rooms === opt.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border/70 bg-background text-muted-foreground hover:border-primary/40'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </fieldset>

      {(specKeys.has('priceMin') ||
        specKeys.has('depositMin') ||
        specKeys.has('rentMin')) && (
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold text-foreground">قیمت و اجاره</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {specKeys.has('priceMin') ? (
              <RangeField
                label="قیمت (تومان)"
                minKey="priceMin"
                maxKey="priceMax"
                filters={filters}
                onPatch={onPatch}
              />
            ) : null}
            {specKeys.has('depositMin') ? (
              <RangeField
                label="رهن (تومان)"
                minKey="depositMin"
                maxKey="depositMax"
                filters={filters}
                onPatch={onPatch}
              />
            ) : null}
            {specKeys.has('rentMin') ? (
              <RangeField
                label="اجاره (تومان)"
                minKey="rentMin"
                maxKey="rentMax"
                filters={filters}
                onPatch={onPatch}
              />
            ) : null}
          </div>
        </fieldset>
      )}

      {specKeys.has('amenities') ? (
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold text-foreground">امکانات</legend>
          <div className="flex flex-wrap gap-1.5">
            {FILING_AMENITY_OPTIONS.map((opt) => {
              const active = filters.amenities.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleAmenity(opt.value)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/70 bg-background text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
