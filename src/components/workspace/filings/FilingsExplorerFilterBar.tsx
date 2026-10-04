'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { BrowseFilterPill } from '@/components/browse/BrowseFilterPill';
import { toPersianDigits } from '@/lib/format/digits';
import { FilingsExplorerFilterSheet } from './FilingsExplorerFilterSheet';
import { FilingsExplorerQuickFilters } from './FilingsExplorerQuickFilters';
import type { useFilingsExplorerFilters } from './useFilingsExplorerFilters';

type Explorer = ReturnType<typeof useFilingsExplorerFilters>;

export function FilingsExplorerFilterBar({
  explorer,
  sheetOpen: sheetOpenProp,
  onSheetOpenChange,
}: {
  explorer: Explorer;
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
}) {
  const [sheetOpenInternal, setSheetOpenInternal] = useState(false);
  const sheetOpen = sheetOpenProp ?? sheetOpenInternal;
  const setSheetOpen = onSheetOpenChange ?? setSheetOpenInternal;
  const { activeCount } = explorer;

  return (
    <>
      <div className="shrink-0 border-b border-border/50 bg-muted/10 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <BrowseFilterPill
            variant="trigger"
            label={
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="size-4" />
                فیلترها
              </span>
            }
            active={activeCount > 0}
            badge={activeCount > 0 ? toPersianDigits(activeCount) : undefined}
            onClick={() => setSheetOpen(true)}
          />

          <span aria-hidden className="h-6 w-px shrink-0 self-center bg-border/60" />

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [mask-image:linear-gradient(to_left,#000_calc(100%-24px),transparent)] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:[mask-image:none] [&::-webkit-scrollbar]:hidden">
            <FilingsExplorerQuickFilters explorer={explorer} />
          </div>
        </div>
      </div>

      <FilingsExplorerFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        explorer={explorer}
      />
    </>
  );
}
