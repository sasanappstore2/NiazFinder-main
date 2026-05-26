import type { ResolvedCategoryFilters } from '@/config/category-filters/types';
import type { BrowseFilters, ListingType } from '@/lib/filters/parser';

function globalKeysForListingType(listingType: ListingType): Set<string> {
  if (listingType === 'business') {
    return new Set(['verified', 'sort']);
  }
  return new Set(['price', 'hasPhoto', 'urgent', 'recent', 'sort']);
}

/** Drop query params that are not valid for the active marketplace/category. */
export function sanitizeFiltersForListingType(
  filters: BrowseFilters,
  resolved: ResolvedCategoryFilters
): BrowseFilters {
  const listingType = resolved.listingType;
  const allowedGlobals = globalKeysForListingType(listingType);
  const activeGlobalKeys = new Set(
    resolved.browseFields.filter((f) => f.globalKey).map((f) => f.globalKey!)
  );

  const next: BrowseFilters = {
    ...filters,
    attributes: { ...filters.attributes },
  };

  if (!allowedGlobals.has('price') || !activeGlobalKeys.has('price')) {
    next.priceMin = null;
    next.priceMax = null;
  }
  if (!allowedGlobals.has('hasPhoto') || !activeGlobalKeys.has('hasPhoto')) {
    next.hasPhoto = null;
  }
  if (!allowedGlobals.has('urgent') || !activeGlobalKeys.has('urgent')) {
    next.urgent = null;
  }
  if (!allowedGlobals.has('recent') || !activeGlobalKeys.has('recent')) {
    next.recent = null;
  }
  if (!allowedGlobals.has('verified') || !activeGlobalKeys.has('verified')) {
    next.verified = null;
  }

  if (listingType === 'business') {
    if (next.sort === 'price-asc' || next.sort === 'price-desc' || next.sort === 'oldest') {
      next.sort = 'rating';
    }
  } else if (next.sort === 'rating') {
    next.sort = 'newest';
  }

  const allowed = resolved.allowedUrlParams;
  for (const key of Object.keys(next.attributes)) {
    if (!allowed.has(key)) {
      delete next.attributes[key];
    }
  }

  return next;
}

/** Count active filters relevant to the resolved browse field set. */
export function countBrowseFilters(
  f: BrowseFilters,
  resolved: ResolvedCategoryFilters
): number {
  const listingType = resolved.listingType;
  const allowedGlobals = globalKeysForListingType(listingType);
  let n = 0;

  if (f.q) n++;
  if (f.status) n++;
  if (allowedGlobals.has('price') && (f.priceMin != null || f.priceMax != null)) n++;
  if (allowedGlobals.has('verified') && f.verified === true) n++;
  if (allowedGlobals.has('hasPhoto') && f.hasPhoto === true) n++;
  if (allowedGlobals.has('urgent') && f.urgent === true) n++;
  if (allowedGlobals.has('recent') && f.recent) n++;
  if (f.sort !== (listingType === 'business' ? 'rating' : 'newest')) n++;
  if (f.cities.length > 0) n++;
  if (f.provinces.length > 0) n++;
  if (f.neighborhoods.length > 0) n++;

  for (const key of Object.keys(f.attributes)) {
    if (resolved.allowedUrlParams.has(key) && f.attributes[key]) {
      n++;
    }
  }

  return n;
}

export function browseFiltersEqual(a: BrowseFilters, b: BrowseFilters): boolean {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  return sa === sb;
}
