'use client';

import { MapPinned } from 'lucide-react';
import { BrowseFilterPill } from './BrowseFilterPill';
import { NeighborhoodSelectorModal } from './NeighborhoodSelectorModal';
import { useNeighborhoodSelection } from '@/hooks/use-neighborhood-selection';

export function NeighborhoodFilterPill() {
  const {
    open,
    setOpen,
    neighborhoods,
    selectedSlugs,
    showNeighborhoodFilter,
    isLoading,
    pillLabel,
    applySelection,
    clearNeighborhoods,
  } = useNeighborhoodSelection();

  if (!showNeighborhoodFilter) return null;

  return (
    <>
      <BrowseFilterPill
        label={
          <span className="inline-flex items-center gap-1">
            <MapPinned className="size-3.5" />
            {isLoading ? 'محله…' : pillLabel}
          </span>
        }
        active={selectedSlugs.length > 0}
        onClick={() => setOpen(true)}
        onClear={selectedSlugs.length > 0 ? clearNeighborhoods : undefined}
      />
      <NeighborhoodSelectorModal
        open={open}
        onOpenChange={setOpen}
        neighborhoods={neighborhoods}
        selectedIds={selectedSlugs}
        onApply={applySelection}
      />
    </>
  );
}
