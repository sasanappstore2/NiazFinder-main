'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FILING_DEAL_CHIP_OPTIONS,
  FILING_SORT_OPTIONS,
} from '@/config/filing-filters/options';
import type { FilingBrowseFilters } from '@/lib/filing/apply-filing-filters';
import type { FilingCategoryValue } from '@/lib/filing/filing-categories';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { FilingFilterRail } from './filters/FilingFilterRail';

type Props = {
  filters: FilingBrowseFilters;
  neighborhoods: ManagedNeighborhood[];
  neighborhoodsLoading?: boolean;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  onReset: () => void;
  activeCount?: number;
  className?: string;
};

export function FilingBrowseFilterPanel({
  filters,
  neighborhoods,
  neighborhoodsLoading = false,
  onPatch,
  onReset,
  activeCount = 0,
  className,
}: Props) {
  return (
    <section className={cn('filing-browse-filter-rail', className)} aria-label="فیلتر فایلینگ">
      <div className="filing-browse-filter-rail__toolbar">
        <div className="filing-browse-filter-rail__search">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filters.q}
            onChange={(e) => onPatch({ q: e.target.value })}
            placeholder="جستجو در عنوان، محله، کد فایل…"
            className="filing-browse-filter-rail__search-input"
            aria-label="جستجو در فایلینگ"
          />
        </div>

        <Select
          value={filters.sort}
          onValueChange={(v) => onPatch({ sort: v as FilingBrowseFilters['sort'] })}
        >
          <SelectTrigger className="filing-browse-filter-rail__sort" aria-label="مرتب‌سازی نتایج">
            <SelectValue placeholder="مرتب‌سازی" />
          </SelectTrigger>
          <SelectContent>
            {FILING_SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="filing-browse-quick-deals" role="group" aria-label="نوع واگذاری سریع">
        {FILING_DEAL_CHIP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              'filing-browse-quick-deals__btn',
              filters.dealType === opt.value && 'is-active'
            )}
            aria-pressed={filters.dealType === opt.value}
            onClick={() => onPatch({ dealType: opt.value as FilingCategoryValue | 'all' })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <FilingFilterRail
        filters={filters}
        neighborhoods={neighborhoods}
        neighborhoodsLoading={neighborhoodsLoading}
        onPatch={onPatch}
        onReset={onReset}
        activeCount={activeCount}
      />
    </section>
  );
}
