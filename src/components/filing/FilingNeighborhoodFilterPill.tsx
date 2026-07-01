'use client';

import { useMemo, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { BrowseFilterPill } from '@/components/browse/BrowseFilterPill';
import { NeighborhoodSelectorModal } from '@/components/browse/NeighborhoodSelectorModal';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';

type Props = {
  selectedSlugs: string[];
  neighborhoods: ManagedNeighborhood[];
  isLoading?: boolean;
  onApply: (slugs: string[]) => void;
  onClear: () => void;
};

export function FilingNeighborhoodFilterPill({
  selectedSlugs,
  neighborhoods,
  isLoading = false,
  onApply,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);

  const selectedById = useMemo(() => {
    const map = new Map(neighborhoods.map((n) => [n.id, n]));
    return selectedSlugs.map((id) => map.get(id)).filter(Boolean) as ManagedNeighborhood[];
  }, [neighborhoods, selectedSlugs]);

  if (!isLoading && neighborhoods.length === 0) return null;

  const pillLabel =
    selectedById.length === 0
      ? 'انتخاب محله'
      : selectedById.length === 1
        ? selectedById[0]!.name
        : `${selectedById.length} محله`;

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
        onClear={selectedSlugs.length > 0 ? onClear : undefined}
        className="shrink-0"
      />
      {open ? (
        <NeighborhoodSelectorModal
          open={open}
          onOpenChange={setOpen}
          neighborhoods={neighborhoods}
          selectedIds={selectedSlugs}
          onApply={(slugs) => {
            onApply(slugs);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
