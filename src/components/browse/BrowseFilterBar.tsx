'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { BrowseFilterPill } from './BrowseFilterPill';
import { BrowseFilterSheet } from './BrowseFilterSheet';
import { CategoryFilterControls, GlobalBrowseControls } from './CategoryFilterControls';
import { useBrowseFilters } from '@/hooks/use-browse-filters';
import { NeighborhoodFilterPill } from './NeighborhoodFilterPill';

export function BrowseFilterBar() {
  const {
    filters,
    listingType,
    categoryLabel,
    categorySlug,
    queryFilterCount,
    categoryFilters,
    replaceFilters,
    replaceAttributes,
    clearQueryFilters,
    clearCategoryFromPath,
  } = useBrowseFilters();

  const [sheetOpen, setSheetOpen] = useState(false);
  const isBusiness = listingType === 'business';
  const { browseFields } = categoryFilters;

  return (
    <>
      <div className="-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 md:flex-nowrap [&::-webkit-scrollbar]:hidden">
        <BrowseFilterPill
          label={
            <span className="inline-flex items-center gap-1">
              <SlidersHorizontal className="size-3.5" />
              {queryFilterCount > 0 ? `${queryFilterCount} فیلتر` : 'فیلتر'}
            </span>
          }
          active={queryFilterCount > 0}
          onClick={() => setSheetOpen(true)}
        />

        {categorySlug && categoryLabel && (
          <BrowseFilterPill label={categoryLabel} active onClear={clearCategoryFromPath} />
        )}

        <NeighborhoodFilterPill />

        <GlobalBrowseControls
          fields={browseFields}
          filters={filters}
          onPatchGlobal={replaceFilters}
        />

        <CategoryFilterControls
          fields={browseFields}
          filters={filters}
          isBusiness={isBusiness}
          onPatchGlobal={replaceFilters}
          onPatchAttributes={replaceAttributes}
        />
      </div>

      <BrowseFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        browseFields={browseFields}
        isBusiness={isBusiness}
        onApplyGlobal={replaceFilters}
        onApplyAttributes={replaceAttributes}
        onClearAll={clearQueryFilters}
      />
    </>
  );
}

export function BrowseFilterTriggerIcon() {
  return <SlidersHorizontal className="size-3.5" />;
}
