'use client';

import { cn } from '@/lib/utils';
import {
  FILING_DEAL_CHIP_OPTIONS,
  FILING_KIND_CHIP_OPTIONS,
} from '@/config/filing-filters/options';
import type { FilingCategoryValue, FilingKindValue } from '@/lib/filing/filing-categories';

type Props = {
  dealType: FilingCategoryValue | 'all';
  propertyKind: FilingKindValue | 'all';
  onDealChange: (value: FilingCategoryValue | 'all') => void;
  onKindChange: (value: FilingKindValue | 'all') => void;
  className?: string;
  compact?: boolean;
};

function SegmentGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="filing-category-segments" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cn('filing-category-segments__btn', value === opt.value && 'is-active')}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function FilingCategoryBar({
  dealType,
  propertyKind,
  onDealChange,
  onKindChange,
  className,
  compact = false,
}: Props) {
  const dealOptions = FILING_DEAL_CHIP_OPTIONS;
  const kindOptions = FILING_KIND_CHIP_OPTIONS;

  return (
    <div
      className={cn(
        'filing-category-bar',
        compact && 'filing-category-bar--compact',
        className
      )}
    >
      <SegmentGroup<FilingCategoryValue | 'all'>
        label="نوع واگذاری"
        options={dealOptions as ReadonlyArray<{ value: FilingCategoryValue | 'all'; label: string }>}
        value={dealType}
        onChange={onDealChange}
      />
      <SegmentGroup<FilingKindValue | 'all'>
        label="نوع ملک"
        options={kindOptions as ReadonlyArray<{ value: FilingKindValue | 'all'; label: string }>}
        value={propertyKind}
        onChange={onKindChange}
      />
    </div>
  );
}
