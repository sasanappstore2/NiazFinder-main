'use client';

import { useMemo, useState } from 'react';
import type {
  WorkspaceCollaborationItem,
  WorkspaceFileItem,
  WorkspaceFiltersState,
  WorkspaceNeedItem,
} from '../types';
import { DEFAULT_WORKSPACE_FILTERS as DEFAULTS } from '../types';

function parsePrice(value: string | null | undefined): number | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function inDateRange(iso: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  const t = new Date(iso).getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}

function filterNeeds(items: WorkspaceNeedItem[], f: WorkspaceFiltersState): WorkspaceNeedItem[] {
  return items.filter((item) => {
    if (f.city !== 'all' && item.location && !item.location.includes(f.city)) return false;
    if (f.propertyType !== 'all' && item.propertyType !== f.propertyType) return false;
    if (!inDateRange(item.createdAt, f.dateFrom, f.dateTo)) return false;
    if (f.priceMin || f.priceMax) {
      const budget = parsePrice(item.budget);
      if (budget === null) return false;
      const min = f.priceMin ? Number(f.priceMin) : null;
      const max = f.priceMax ? Number(f.priceMax) : null;
      if (min !== null && budget < min) return false;
      if (max !== null && budget > max) return false;
    }
    return true;
  });
}

function filterFiles(items: WorkspaceFileItem[], f: WorkspaceFiltersState): WorkspaceFileItem[] {
  return items.filter((item) => {
    if (f.city !== 'all') {
      const cityMatch =
        item.listing.cityId === f.city ||
        (item.listing.location?.includes(f.city) ?? false);
      if (!cityMatch) return false;
    }
    if (f.region !== 'all' && item.listing.location !== f.region) return false;
    if (f.propertyType !== 'all' && item.categoryLabel !== f.propertyType) return false;
    if (f.dealType !== 'all') {
      if (item.dealLabel !== f.dealType && item.colorLabel !== f.dealType) return false;
    }
    if (item.createdAt && !inDateRange(item.createdAt, f.dateFrom, f.dateTo)) return false;
    if (f.priceMin || f.priceMax) {
      const price = parsePrice(item.priceDisplay);
      if (price === null) return false;
      const min = f.priceMin ? Number(f.priceMin) : null;
      const max = f.priceMax ? Number(f.priceMax) : null;
      if (min !== null && price < min) return false;
      if (max !== null && price > max) return false;
    }
    return true;
  });
}

function filterCollaborations(
  items: WorkspaceCollaborationItem[],
  f: WorkspaceFiltersState
): WorkspaceCollaborationItem[] {
  return items.filter((item) => {
    if (f.region !== 'all' && item.area && !item.area.includes(f.region)) return false;
    if (!inDateRange(item.createdAt, f.dateFrom, f.dateTo)) return false;
    return true;
  });
}

export function useWorkspaceFilters(
  needs: WorkspaceNeedItem[],
  files: WorkspaceFileItem[],
  collaborations: WorkspaceCollaborationItem[]
) {
  const [filters, setFilters] = useState<WorkspaceFiltersState>({ ...DEFAULTS });

  const filtered = useMemo(
    () => ({
      needs: filterNeeds(needs, filters),
      files: filterFiles(files, filters),
      collaborations: filterCollaborations(collaborations, filters),
    }),
    [needs, files, collaborations, filters]
  );

  const hasActiveFilters = useMemo(
    () =>
      filters.city !== 'all' ||
      filters.region !== 'all' ||
      filters.propertyType !== 'all' ||
      filters.dealType !== 'all' ||
      Boolean(filters.priceMin) ||
      Boolean(filters.priceMax) ||
      Boolean(filters.dateFrom) ||
      Boolean(filters.dateTo),
    [filters]
  );

  const resetFilters = () => setFilters({ ...DEFAULTS });

  return { filters, setFilters, filtered, hasActiveFilters, resetFilters };
}
