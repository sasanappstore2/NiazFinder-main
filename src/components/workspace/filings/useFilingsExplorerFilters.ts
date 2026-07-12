'use client';

import { useMemo, useState } from 'react';
import { toAsciiDigits } from '@/lib/format/digits';
import {
  inferListingPropertyKind,
  resolveListingDealType,
  WORKSPACE_DEAL_TYPE_OPTIONS,
  WORKSPACE_PROPERTY_KIND_OPTIONS,
} from '@/lib/business/workspace/filing-preferences';
import type { WorkspacePropertyKind } from '@/lib/business/ecosystem/types';
import { parseListingAreaSqm } from './filing-list-card-present';
import type { WorkspaceFileItem } from '../types';

export type FilingsExplorerSort = 'default' | 'price_asc' | 'price_desc' | 'title';

export type FilingsFileType = 'all' | 'own' | 'peer' | 'import';

export type FilingsPosterKind = 'all' | 'broker' | 'owner';

export type FilingsExplorerFilters = {
  /** واژه جستجو */
  q: string;
  /** منبع فایل */
  fileType: FilingsFileType;
  /** آگهی‌دهنده: مشاور یا مالک */
  posterKind: FilingsPosterKind;
  /** منطقه */
  region: string;
  /** نوع واگذاری */
  dealType: string;
  /** نوع ملک */
  propertyKind: string;
  /** حداقل متراژ */
  areaMin: string;
  /** حداکثر متراژ */
  areaMax: string;
  /** کد فایل */
  fileCode: string;
  /** تاریخ درج — YYYY-MM-DD */
  insertedDate: string;
  sort: FilingsExplorerSort;
};

export const DEFAULT_FILINGS_EXPLORER_FILTERS: FilingsExplorerFilters = {
  q: '',
  fileType: 'all',
  posterKind: 'all',
  region: 'all',
  dealType: 'all',
  propertyKind: 'all',
  areaMin: '',
  areaMax: '',
  fileCode: '',
  insertedDate: '',
  sort: 'default',
};

export const FILINGS_FILE_TYPE_OPTIONS = [
  { value: 'all' as const, label: 'همه منابع' },
  { value: 'own' as const, label: 'پروفایل من' },
  { value: 'peer' as const, label: 'مشاوران منطقه' },
  { value: 'import' as const, label: 'فایلینگ منطقه' },
];

export const FILINGS_POSTER_KIND_OPTIONS = [
  { value: 'all' as const, label: 'همه آگهی‌دهندگان' },
  { value: 'broker' as const, label: 'مشاور املاک' },
  { value: 'owner' as const, label: 'مالک' },
];

function matchesQuery(item: WorkspaceFileItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    item.listing.title,
    item.listing.location,
    item.listing.description,
    item.dealLabel,
    item.categoryLabel,
    item.sourceProvider,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

function matchesFileCode(item: WorkspaceFileItem, code: string): boolean {
  const needle = toAsciiDigits(code.trim());
  if (!needle) return true;
  const fileCode = item.listing.fileCode?.trim();
  if (fileCode) return toAsciiDigits(fileCode).includes(needle);
  const idAscii = toAsciiDigits(item.listing.id);
  return idAscii.includes(needle);
}

function matchesInsertedDate(item: WorkspaceFileItem, date: string): boolean {
  if (!date) return true;
  if (!item.createdAt) return false;
  return item.createdAt.slice(0, 10) === date;
}

function matchesArea(item: WorkspaceFileItem, min: string, max: string): boolean {
  const sqm = parseListingAreaSqm(item.listing.area);
  if (sqm === null) {
    if (min || max) return false;
    return true;
  }
  if (min) {
    const n = Number(toAsciiDigits(min));
    if (Number.isFinite(n) && sqm < n) return false;
  }
  if (max) {
    const n = Number(toAsciiDigits(max));
    if (Number.isFinite(n) && sqm > n) return false;
  }
  return true;
}

export function collectFilingsExplorerOptions(items: WorkspaceFileItem[]) {
  const regions = new Set<string>();
  for (const item of items) {
    if (item.listing.location?.trim()) regions.add(item.listing.location.trim());
  }
  return {
    regions: [...regions].sort((a, b) => a.localeCompare(b, 'fa')),
  };
}

function sortItems(items: WorkspaceFileItem[], sort: FilingsExplorerSort): WorkspaceFileItem[] {
  if (sort === 'default') return items;
  const copy = [...items];
  if (sort === 'title') {
    return copy.sort((a, b) => a.listing.title.localeCompare(b.listing.title, 'fa'));
  }
  const parsePrice = (value: string | null | undefined) => {
    const digits = (value ?? '').replace(/[^\d]/g, '');
    const n = Number(digits);
    return Number.isFinite(n) ? n : 0;
  };
  return copy.sort((a, b) => {
    const pa = parsePrice(a.priceDisplay);
    const pb = parsePrice(b.priceDisplay);
    return sort === 'price_asc' ? pa - pb : pb - pa;
  });
}

export function filterFilingsExplorerItems(
  items: WorkspaceFileItem[],
  filters: FilingsExplorerFilters
): WorkspaceFileItem[] {
  const result = items.filter((item) => {
    if (!matchesQuery(item, filters.q)) return false;
    if (!matchesFileCode(item, filters.fileCode)) return false;
    if (!matchesInsertedDate(item, filters.insertedDate)) return false;
    if (!matchesArea(item, filters.areaMin, filters.areaMax)) return false;

    if (filters.fileType === 'own' && item.sourceKind !== 'own') return false;
    if (filters.fileType === 'peer' && item.sourceKind !== 'peer') return false;
    if (filters.fileType === 'import' && item.sourceKind !== 'import') return false;

    if (filters.posterKind === 'broker') {
      if (item.posterKind !== 'broker' && item.posterKind !== 'own') return false;
    }
    if (filters.posterKind === 'owner' && item.posterKind !== 'owner') return false;

    if (filters.region !== 'all' && item.listing.location !== filters.region) return false;

    if (filters.dealType !== 'all') {
      const deal = resolveListingDealType(item.listing);
      if (deal !== filters.dealType) return false;
    }

    if (filters.propertyKind !== 'all') {
      const kind = inferListingPropertyKind(item.listing);
      if (kind !== filters.propertyKind) return false;
    }

    return true;
  });

  return sortItems(result, filters.sort);
}

export function filingsExplorerActiveFilterCount(filters: FilingsExplorerFilters): number {
  let count = 0;
  if (filters.fileType !== 'all') count += 1;
  if (filters.posterKind !== 'all') count += 1;
  if (filters.region !== 'all') count += 1;
  if (filters.dealType !== 'all') count += 1;
  if (filters.propertyKind !== 'all') count += 1;
  if (filters.areaMin || filters.areaMax) count += 1;
  if (filters.fileCode.trim()) count += 1;
  if (filters.insertedDate) count += 1;
  if (filters.q.trim()) count += 1;
  return count;
}

export function filingsExplorerHasActiveFilters(filters: FilingsExplorerFilters): boolean {
  return filingsExplorerActiveFilterCount(filters) > 0;
}

export type FilingsActiveFilterChip = {
  key: keyof FilingsExplorerFilters | 'area';
  label: string;
  clear: Partial<FilingsExplorerFilters>;
};

export function filingsExplorerActiveChips(
  filters: FilingsExplorerFilters,
  options: { dealTypeOptions: typeof WORKSPACE_DEAL_TYPE_OPTIONS; propertyKindOptions: typeof WORKSPACE_PROPERTY_KIND_OPTIONS }
): FilingsActiveFilterChip[] {
  const chips: FilingsActiveFilterChip[] = [];

  if (filters.q.trim()) {
    chips.push({ key: 'q', label: `جستجو: ${filters.q.trim()}`, clear: { q: '' } });
  }
  if (filters.fileType !== 'all') {
    const label = FILINGS_FILE_TYPE_OPTIONS.find((o) => o.value === filters.fileType)?.label ?? '';
    chips.push({ key: 'fileType', label, clear: { fileType: 'all' } });
  }
  if (filters.posterKind !== 'all') {
    const label =
      FILINGS_POSTER_KIND_OPTIONS.find((o) => o.value === filters.posterKind)?.label ?? '';
    chips.push({ key: 'posterKind', label, clear: { posterKind: 'all' } });
  }
  if (filters.region !== 'all') {
    chips.push({ key: 'region', label: filters.region, clear: { region: 'all' } });
  }
  if (filters.dealType !== 'all') {
    const label =
      options.dealTypeOptions.find((o) => o.value === filters.dealType)?.label ?? filters.dealType;
    chips.push({ key: 'dealType', label, clear: { dealType: 'all' } });
  }
  if (filters.propertyKind !== 'all') {
    const label =
      options.propertyKindOptions.find((o) => o.value === filters.propertyKind)?.label ??
      filters.propertyKind;
    chips.push({ key: 'propertyKind', label, clear: { propertyKind: 'all' } });
  }
  if (filters.areaMin || filters.areaMax) {
    chips.push({
      key: 'area',
      label: 'محدوده متراژ',
      clear: { areaMin: '', areaMax: '' },
    });
  }
  if (filters.fileCode.trim()) {
    chips.push({
      key: 'fileCode',
      label: `کد: ${filters.fileCode.trim()}`,
      clear: { fileCode: '' },
    });
  }
  if (filters.insertedDate) {
    chips.push({
      key: 'insertedDate',
      label: `تاریخ درج`,
      clear: { insertedDate: '' },
    });
  }

  return chips;
}

export function useFilingsExplorerFilters(items: WorkspaceFileItem[]) {
  const [filters, setFilters] = useState<FilingsExplorerFilters>({
    ...DEFAULT_FILINGS_EXPLORER_FILTERS,
  });

  const options = useMemo(() => collectFilingsExplorerOptions(items), [items]);

  const filtered = useMemo(
    () => filterFilingsExplorerItems(items, filters),
    [items, filters]
  );

  const reset = () => setFilters({ ...DEFAULT_FILINGS_EXPLORER_FILTERS });

  const patch = (patch: Partial<FilingsExplorerFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const dealTypeOptions = WORKSPACE_DEAL_TYPE_OPTIONS;
  const propertyKindOptions = WORKSPACE_PROPERTY_KIND_OPTIONS;

  const activeChips = useMemo(
    () => filingsExplorerActiveChips(filters, { dealTypeOptions, propertyKindOptions }),
    [filters, dealTypeOptions, propertyKindOptions]
  );

  return {
    filters,
    setFilters,
    patch,
    reset,
    filtered,
    options,
    activeChips,
    hasActive: filingsExplorerHasActiveFilters(filters),
    activeCount: filingsExplorerActiveFilterCount(filters),
    dealTypeOptions,
    propertyKindOptions,
  };
}

export type { WorkspacePropertyKind };
