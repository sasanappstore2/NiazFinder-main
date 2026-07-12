'use client';

import { useMemo } from 'react';
import { ActiveFilterChip } from '@/components/ui/filters';
import type { FilingBrowseFilters } from '@/lib/filing/apply-filing-filters';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import { FilingNeighborhoodFilterPill } from '../FilingNeighborhoodFilterPill';
import { FilingFilterPill } from './FilingFilterPill';
import { filingRailFiltersForDeal } from './filing-filter-meta';

type Props = {
  filters: FilingBrowseFilters;
  neighborhoods: ManagedNeighborhood[];
  neighborhoodsLoading?: boolean;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  onReset: () => void;
  activeCount: number;
};

export function FilingFilterRail({
  filters,
  neighborhoods,
  neighborhoodsLoading = false,
  onPatch,
  onReset,
  activeCount,
}: Props) {
  const railFilters = useMemo(
    () => filingRailFiltersForDeal(filters.dealType),
    [filters.dealType]
  );

  const multiAmenityActive =
    filters.amenities.length > 1 ? railFilters.find((f) => f.key === 'amenities') : null;

  return (
    <div className="filing-filter-rail">
      <div className="filing-filter-rail__row">
        <div className="filing-filter-rail__pills" role="group" aria-label="فیلترهای پیشرفته">
          <FilingNeighborhoodFilterPill
            selectedSlugs={filters.neighborhoods}
            neighborhoods={neighborhoods}
            isLoading={neighborhoodsLoading}
            onApply={(slugs) => onPatch({ neighborhoods: slugs })}
            onClear={() => onPatch({ neighborhoods: [] })}
          />

          {railFilters.map((meta) => (
            <FilingFilterPill key={meta.key} meta={meta} filters={filters} onPatch={onPatch} />
          ))}

          {activeCount > 0 ? (
            <button type="button" onClick={onReset} className="filing-browse-chips__clear">
              پاک کردن همه
            </button>
          ) : null}
        </div>
      </div>

      {multiAmenityActive ? (
        <div className="filing-filter-rail__active" aria-label="فیلترهای فعال">
          <ActiveFilterChip
            icon={<multiAmenityActive.icon className="size-3.5" />}
            label={multiAmenityActive.label}
            value={multiAmenityActive.summary(filters)}
            onClear={() => onPatch(multiAmenityActive.clearPatch())}
          />
        </div>
      ) : null}
    </div>
  );
}
