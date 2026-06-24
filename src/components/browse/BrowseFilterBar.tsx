'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { BrowseFilterPill } from './BrowseFilterPill';
import { BrowseFilterSheet } from './BrowseFilterSheet';
import { CategoryFilterControls, GlobalBrowseControls } from './CategoryFilterControls';
import { useBrowseFilters } from '@/hooks/use-browse-filters';
import { NeighborhoodFilterPill } from './NeighborhoodFilterPill';
import { toPersianDigits } from '@/lib/format/digits';

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
      {/* Outer row: the leading "filters" command button + divider stay pinned
          (outside the scroller) so the primary affordance is always reachable;
          only the quick-filter chips scroll. */}
      <div className="flex min-w-0 items-center gap-2">
        <BrowseFilterPill
          variant="trigger"
          label={
            <span className="inline-flex items-center gap-1.5">
              <SlidersHorizontal className="size-4" />
              فیلترها
            </span>
          }
          active={queryFilterCount > 0}
          badge={queryFilterCount > 0 ? toPersianDigits(queryFilterCount) : undefined}
          onClick={() => setSheetOpen(true)}
        />

        <span aria-hidden className="h-6 w-px shrink-0 self-center bg-border/60" />

        {/* Quick-filter lane. Below md: horizontal scroll with a CSS mask fade on
            the trailing (left/RTL) edge hinting "more exists". md+: wraps, no
            scroll/mask. overscroll-x-contain stops swipes triggering back-nav. */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [mask-image:linear-gradient(to_left,#000_calc(100%-24px),transparent)] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:[mask-image:none] [&::-webkit-scrollbar]:hidden">
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
        activeCount={queryFilterCount}
      />
    </>
  );
}

export function BrowseFilterTriggerIcon() {
  return <SlidersHorizontal className="size-3.5" />;
}
