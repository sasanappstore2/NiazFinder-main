'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { filingFilterPillClasses } from '@/components/browse/BrowseFilterPill';
import type { FilingBrowseFilters } from '@/lib/filing/apply-filing-filters';
import type { FilingRailFilterMeta } from './filing-filter-meta';
import { FilingFilterPopover } from './FilingFilterPopover';

type Props = {
  meta: FilingRailFilterMeta;
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
};

export function FilingFilterPill({ meta, filters, onPatch }: Props) {
  const [open, setOpen] = useState(false);
  const active = meta.isActive(filters);
  const summary = meta.summary(filters);
  const Icon = meta.icon;

  const label = active && summary ? (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="max-w-[8rem] truncate">{summary}</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );

  const pillClass = filingFilterPillClasses(active);

  const trigger =
    active ? (
      <div className={pillClass}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPatch(meta.clearPatch());
          }}
          className="-ms-1.5 -my-2 inline-flex size-8 items-center justify-center rounded-full transition-colors hover:bg-primary/20"
          aria-label="حذف فیلتر"
        >
          <X className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5"
          aria-expanded={open}
        >
          <span className="whitespace-nowrap">{label}</span>
          <ChevronDown className="size-3 opacity-60" />
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={pillClass}
        aria-expanded={open}
      >
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown className="size-3 opacity-60" />
      </button>
    );

  return (
    <FilingFilterPopover
      meta={meta}
      filters={filters}
      onPatch={onPatch}
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
    />
  );
}
