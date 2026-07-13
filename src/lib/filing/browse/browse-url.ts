import type { FilingBrowseFilters } from '@/lib/filing/apply-filing-filters';
import { DEFAULT_FILING_BROWSE_FILTERS } from '@/lib/filing/apply-filing-filters';
import type { FilingSortKey } from '@/lib/filing/browse/filter-options';

function splitList(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((v) => v.trim()).filter(Boolean);
}

function pickString(sp: URLSearchParams, key: string, fallback = ''): string {
  return sp.get(key)?.trim() ?? fallback;
}

export function filtersFromSearchParams(sp: URLSearchParams): FilingBrowseFilters {
  const sort = pickString(sp, 'sort', 'default') as FilingSortKey;
  const validSorts: FilingSortKey[] = [
    'default',
    'newest',
    'price_asc',
    'price_desc',
    'area_asc',
    'area_desc',
  ];

  return {
    ...DEFAULT_FILING_BROWSE_FILTERS,
    q: pickString(sp, 'q'),
    posterKind: (pickString(sp, 'posterKind', 'all') || 'all') as FilingBrowseFilters['posterKind'],
    dealType: pickString(sp, 'dealType', 'all') || 'all',
    propertyKind: pickString(sp, 'propertyKind', 'all') || 'all',
    neighborhoods: splitList(sp.get('neighborhoods')),
    areaMin: pickString(sp, 'areaMin'),
    areaMax: pickString(sp, 'areaMax'),
    priceMin: pickString(sp, 'priceMin'),
    priceMax: pickString(sp, 'priceMax'),
    depositMin: pickString(sp, 'depositMin'),
    depositMax: pickString(sp, 'depositMax'),
    rentMin: pickString(sp, 'rentMin'),
    rentMax: pickString(sp, 'rentMax'),
    rooms: pickString(sp, 'rooms'),
    buildingAgeMax: pickString(sp, 'buildingAgeMax'),
    floorMin: pickString(sp, 'floorMin'),
    floorMax: pickString(sp, 'floorMax'),
    fileCode: pickString(sp, 'fileCode'),
    insertedDate: pickString(sp, 'insertedDate'),
    amenities: splitList(sp.get('amenities')),
    sort: validSorts.includes(sort) ? sort : 'default',
  };
}

export function searchParamsFromFilters(
  filters: FilingBrowseFilters,
  page = 1
): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.q.trim()) sp.set('q', filters.q.trim());
  if (filters.posterKind !== 'all') sp.set('posterKind', filters.posterKind);
  if (filters.dealType !== 'all') sp.set('dealType', filters.dealType);
  if (filters.propertyKind !== 'all') sp.set('propertyKind', filters.propertyKind);
  if (filters.neighborhoods.length) sp.set('neighborhoods', filters.neighborhoods.join(','));
  if (filters.areaMin) sp.set('areaMin', filters.areaMin);
  if (filters.areaMax) sp.set('areaMax', filters.areaMax);
  if (filters.priceMin) sp.set('priceMin', filters.priceMin);
  if (filters.priceMax) sp.set('priceMax', filters.priceMax);
  if (filters.depositMin) sp.set('depositMin', filters.depositMin);
  if (filters.depositMax) sp.set('depositMax', filters.depositMax);
  if (filters.rentMin) sp.set('rentMin', filters.rentMin);
  if (filters.rentMax) sp.set('rentMax', filters.rentMax);
  if (filters.rooms) sp.set('rooms', filters.rooms);
  if (filters.buildingAgeMax) sp.set('buildingAgeMax', filters.buildingAgeMax);
  if (filters.floorMin) sp.set('floorMin', filters.floorMin);
  if (filters.floorMax) sp.set('floorMax', filters.floorMax);
  if (filters.fileCode.trim()) sp.set('fileCode', filters.fileCode.trim());
  if (filters.insertedDate) sp.set('insertedDate', filters.insertedDate);
  if (filters.amenities.length) sp.set('amenities', filters.amenities.join(','));
  if (filters.sort !== 'default') sp.set('sort', filters.sort);
  if (page > 1) sp.set('page', String(page));
  return sp;
}

export function browsePageFromSearchParams(sp: URLSearchParams): number {
  const page = Number(sp.get('page') ?? 1);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
