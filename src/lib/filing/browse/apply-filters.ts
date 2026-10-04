import { toAsciiDigits } from '@/lib/format/digits';
import { parseMoneyInput } from '@/lib/format/money';
import {
  isListingRentDeal,
  isListingSaleDeal,
  normalizeListingDealType,
} from '@/lib/business/real-estate-listing-deal-types';
import {
  listingMatchesPropertyKindFilter,
  resolveListingDealType,
} from '@/lib/filing/schema/preferences';
import { parseListingAreaSqm } from '@/lib/filing/presentation/list-card-present';
import type { PropertyListing } from '@/contracts/business-profile';
import type { WorkspaceFileItem } from '@/components/workspace/types';
import type { FilingSortKey } from '@/lib/filing/browse/filter-options';
import { filingDealLabel, filingKindLabel } from '@/lib/filing/browse/categories';
import { buildFilingNeighborhoodMatcher } from '@/lib/filing/browse/neighborhood-match';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';

export type FilingBrowsePosterKind = 'all' | 'broker' | 'owner';

export const FILING_POSTER_KIND_OPTIONS: Array<{ value: FilingBrowsePosterKind; label: string }> = [
  { value: 'all', label: 'همه موارد' },
  { value: 'broker', label: 'فایل‌های دفاتر املاک' },
  { value: 'owner', label: 'فایل‌های شخصی' },
];

export type FilingBrowseFilters = {
  q: string;
  /** نوع فایل: مشاور / مالک */
  posterKind: FilingBrowsePosterKind;
  dealType: string;
  propertyKind: string;
  /** Managed neighborhood slugs for the active city */
  neighborhoods: string[];
  areaMin: string;
  areaMax: string;
  priceMin: string;
  priceMax: string;
  depositMin: string;
  depositMax: string;
  rentMin: string;
  rentMax: string;
  rooms: string;
  buildingAgeMax: string;
  floorMin: string;
  floorMax: string;
  fileCode: string;
  insertedDate: string;
  amenities: string[];
  sort: FilingSortKey;
};

export const DEFAULT_FILING_BROWSE_FILTERS: FilingBrowseFilters = {
  q: '',
  posterKind: 'all',
  dealType: 'all',
  propertyKind: 'all',
  neighborhoods: [],
  areaMin: '',
  areaMax: '',
  priceMin: '',
  priceMax: '',
  depositMin: '',
  depositMax: '',
  rentMin: '',
  rentMax: '',
  rooms: '',
  buildingAgeMax: '',
  floorMin: '',
  floorMax: '',
  fileCode: '',
  insertedDate: '',
  amenities: [],
  sort: 'default',
};

/** Clears price/deposit/rent fields incompatible with the active deal type chip. */
export function filingFinancialFiltersClearForDeal(
  dealType: string
): Partial<FilingBrowseFilters> {
  switch (dealType) {
    case 'sell':
      return { depositMin: '', depositMax: '', rentMin: '', rentMax: '' };
    case 'rent_rahn_ejare':
      return { priceMin: '', priceMax: '' };
    case 'rent_rahn_full':
      return { priceMin: '', priceMax: '', rentMin: '', rentMax: '' };
    case 'rent_short_term':
      return { priceMin: '', priceMax: '', depositMin: '', depositMax: '' };
    default:
      return {};
  }
}

/** Clears only advanced-sheet filters (keeps search, category chips, neighborhood). */
export const FILING_BROWSE_SHEET_FILTER_RESET: Partial<FilingBrowseFilters> = {
  posterKind: 'all',
  areaMin: '',
  areaMax: '',
  priceMin: '',
  priceMax: '',
  depositMin: '',
  depositMax: '',
  rentMin: '',
  rentMax: '',
  rooms: '',
  buildingAgeMax: '',
  floorMin: '',
  floorMax: '',
  fileCode: '',
  insertedDate: '',
  amenities: [],
};

function matchesQuery(item: WorkspaceFileItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const listing = item.listing;
  const hay = [
    listing.title,
    listing.location,
    listing.description,
    listing.fileCode,
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
  return toAsciiDigits(item.listing.id).includes(needle);
}

function matchesDate(item: WorkspaceFileItem, date: string): boolean {
  if (!date) return true;
  const raw = item.listing.postedAt ?? item.createdAt ?? item.listing.createdAt;
  if (!raw) return false;
  return raw.slice(0, 10) === date;
}

function matchesRange(
  value: number | null,
  minRaw: string,
  maxRaw: string
): boolean {
  if (value === null) {
    if (minRaw || maxRaw) return false;
    return true;
  }
  if (minRaw) {
    const n = Number(toAsciiDigits(minRaw));
    if (Number.isFinite(n) && value < n) return false;
  }
  if (maxRaw) {
    const n = Number(toAsciiDigits(maxRaw));
    if (Number.isFinite(n) && value > n) return false;
  }
  return true;
}

function listingMoney(
  item: WorkspaceFileItem,
  field: 'price' | 'deposit' | 'rent'
): number | null {
  const listing = item.listing;
  if (field === 'price') return parseMoneyInput(listing.price ?? '');
  if (field === 'deposit') return parseMoneyInput(listing.deposit ?? '');
  return parseMoneyInput(listing.monthlyRent ?? '');
}

const AMENITY_FILTER_KEYS: Record<
  string,
  keyof NonNullable<PropertyListing['amenities']>
> = {
  parking: 'parking',
  storage: 'storage',
  elevator: 'elevator',
  securityDoor: 'securityDoor',
  exchangeable: 'exchangeable',
  terrace: 'terrace',
  builtInWardrobe: 'builtInWardrobe',
};

function matchesAmenities(listing: PropertyListing, selected: string[]): boolean {
  if (!selected.length) return true;
  const flags = listing.amenities;
  if (!flags) return false;
  return selected.every((key) => {
    const field = AMENITY_FILTER_KEYS[key];
    return field ? flags[field] === true : false;
  });
}

function primarySortMoney(item: WorkspaceFileItem): number {
  const listing = item.listing;
  const deal = normalizeListingDealType(listing.dealType);
  if (isListingSaleDeal(listing.dealType)) {
    return listingMoney(item, 'price') ?? 0;
  }
  if (deal === 'rent_rahn_full') {
    return listingMoney(item, 'deposit') ?? 0;
  }
  if (isListingRentDeal(listing.dealType)) {
    return listingMoney(item, 'deposit') ?? listingMoney(item, 'rent') ?? 0;
  }
  return listingMoney(item, 'price') ?? 0;
}

function sortFilings(items: WorkspaceFileItem[], sort: FilingSortKey): WorkspaceFileItem[] {
  if (sort === 'default') return items;
  const copy = [...items];
  if (sort === 'newest') {
    return copy.sort((a, b) => {
      const da = a.listing.postedAt ?? a.createdAt ?? a.listing.createdAt ?? '';
      const db = b.listing.postedAt ?? b.createdAt ?? b.listing.createdAt ?? '';
      return db.localeCompare(da);
    });
  }
  if (sort === 'area_asc' || sort === 'area_desc') {
    return copy.sort((a, b) => {
      const aa = parseListingAreaSqm(a.listing.area) ?? 0;
      const ab = parseListingAreaSqm(b.listing.area) ?? 0;
      return sort === 'area_asc' ? aa - ab : ab - aa;
    });
  }
  return copy.sort((a, b) => {
    const pa = primarySortMoney(a);
    const pb = primarySortMoney(b);
    return sort === 'price_asc' ? pa - pb : pb - pa;
  });
}

export function collectFilingBrowseOptions(items: WorkspaceFileItem[]) {
  const regions = new Set<string>();
  for (const item of items) {
    if (item.listing.location?.trim()) regions.add(item.listing.location.trim());
  }
  return { regions: [...regions].sort((a, b) => a.localeCompare(b, 'fa')) };
}

export function filterFilingBrowseItems(
  items: WorkspaceFileItem[],
  filters: FilingBrowseFilters,
  opts?: { neighborhoods?: ManagedNeighborhood[]; cityName?: string }
): WorkspaceFileItem[] {
  const catalog = opts?.neighborhoods ?? [];
  const cityName = opts?.cityName;
  const matchNeighborhood = buildFilingNeighborhoodMatcher(
    filters.neighborhoods,
    catalog,
    cityName
  );

  const result = items.filter((item) => {
    if (!matchesQuery(item, filters.q)) return false;
    if (!matchesFileCode(item, filters.fileCode)) return false;
    if (!matchesDate(item, filters.insertedDate)) return false;

    const sqm = parseListingAreaSqm(item.listing.area);
    if (!matchesRange(sqm, filters.areaMin, filters.areaMax)) return false;

    if (!matchNeighborhood(item)) {
      return false;
    }

    if (filters.posterKind === 'broker') {
      if (item.posterKind !== 'broker' && item.posterKind !== 'own') return false;
    }
    if (filters.posterKind === 'owner') {
      if (item.posterKind !== 'owner') return false;
    }

    if (filters.dealType !== 'all') {
      if (resolveListingDealType(item.listing) !== filters.dealType) return false;
    }

    if (filters.propertyKind !== 'all') {
      if (!listingMatchesPropertyKindFilter(item.listing, filters.propertyKind)) return false;
    }

    if (filters.rooms) {
      const rooms = item.listing.rooms;
      if (filters.rooms === '5+') {
        if (!rooms || rooms < 5) return false;
      } else {
        const n = Number(filters.rooms);
        if (!rooms || rooms !== n) return false;
      }
    }

    if (filters.buildingAgeMax) {
      const max = Number(toAsciiDigits(filters.buildingAgeMax));
      const age = item.listing.buildingAge;
      if (!Number.isFinite(max) || age == null || age > max) return false;
    }

    if (filters.floorMin || filters.floorMax) {
      const floor = item.listing.floor;
      if (!matchesRange(typeof floor === 'number' ? floor : null, filters.floorMin, filters.floorMax)) {
        return false;
      }
    }

    if (filters.priceMin || filters.priceMax) {
      if (!matchesRange(listingMoney(item, 'price'), filters.priceMin, filters.priceMax)) return false;
    }
    if (filters.depositMin || filters.depositMax) {
      if (!matchesRange(listingMoney(item, 'deposit'), filters.depositMin, filters.depositMax)) {
        return false;
      }
    }
    if (filters.rentMin || filters.rentMax) {
      if (!matchesRange(listingMoney(item, 'rent'), filters.rentMin, filters.rentMax)) return false;
    }

    if (!matchesAmenities(item.listing, filters.amenities)) return false;

    return true;
  });

  return sortFilings(result, filters.sort);
}

export function filingBrowseActiveFilterCount(filters: FilingBrowseFilters): number {
  let count = 0;
  if (filters.q.trim()) count += 1;
  if (filters.posterKind !== 'all') count += 1;
  if (filters.dealType !== 'all') count += 1;
  if (filters.propertyKind !== 'all') count += 1;
  if (filters.neighborhoods.length) count += 1;
  if (filters.areaMin || filters.areaMax) count += 1;
  if (filters.priceMin || filters.priceMax) count += 1;
  if (filters.depositMin || filters.depositMax) count += 1;
  if (filters.rentMin || filters.rentMax) count += 1;
  if (filters.rooms) count += 1;
  if (filters.buildingAgeMax) count += 1;
  if (filters.floorMin || filters.floorMax) count += 1;
  if (filters.fileCode.trim()) count += 1;
  if (filters.insertedDate) count += 1;
  if (filters.amenities.length) count += 1;
  return count;
}

/** Filters inside the advanced sheet (excludes category chips + neighborhood). */
export function filingBrowseSheetFilterCount(filters: FilingBrowseFilters): number {
  let count = 0;
  if (filters.posterKind !== 'all') count += 1;
  if (filters.areaMin || filters.areaMax) count += 1;
  if (filters.priceMin || filters.priceMax) count += 1;
  if (filters.depositMin || filters.depositMax) count += 1;
  if (filters.rentMin || filters.rentMax) count += 1;
  if (filters.rooms) count += 1;
  if (filters.buildingAgeMax) count += 1;
  if (filters.floorMin || filters.floorMax) count += 1;
  if (filters.fileCode.trim()) count += 1;
  if (filters.insertedDate) count += 1;
  if (filters.amenities.length) count += 1;
  return count;
}

export type FilingBrowseActiveChip = {
  key: string;
  label: string;
  clear: Partial<FilingBrowseFilters>;
};

export function filingBrowseActiveChips(
  filters: FilingBrowseFilters,
  neighborhoods: ManagedNeighborhood[] = [],
  opts?: { excludeRail?: boolean }
): FilingBrowseActiveChip[] {
  const chips: FilingBrowseActiveChip[] = [];
  const excludeRail = opts?.excludeRail ?? false;

  if (filters.q.trim()) {
    chips.push({ key: 'q', label: `جستجو: ${filters.q.trim()}`, clear: { q: '' } });
  }
  if (filters.posterKind !== 'all') {
    const label =
      FILING_POSTER_KIND_OPTIONS.find((o) => o.value === filters.posterKind)?.label ??
      filters.posterKind;
    chips.push({ key: 'posterKind', label, clear: { posterKind: 'all' } });
  }
  if (!excludeRail && filters.dealType !== 'all') {
    chips.push({
      key: 'dealType',
      label: filingDealLabel(filters.dealType) ?? filters.dealType,
      clear: { dealType: 'all' },
    });
  }
  if (!excludeRail && filters.propertyKind !== 'all') {
    chips.push({
      key: 'propertyKind',
      label: filingKindLabel(filters.propertyKind) ?? filters.propertyKind,
      clear: { propertyKind: 'all' },
    });
  }
  if (!excludeRail && filters.neighborhoods.length) {
    const names = filters.neighborhoods.map(
      (id) => neighborhoods.find((n) => n.id === id)?.name ?? id
    );
    chips.push({
      key: 'neighborhoods',
      label:
        names.length === 1
          ? `محله: ${names[0]}`
          : `${names.length} محله`,
      clear: { neighborhoods: [] },
    });
  }
  if (filters.areaMin || filters.areaMax) {
    chips.push({ key: 'area', label: 'محدوده متراژ', clear: { areaMin: '', areaMax: '' } });
  }
  if (filters.priceMin || filters.priceMax) {
    chips.push({ key: 'price', label: 'محدوده قیمت', clear: { priceMin: '', priceMax: '' } });
  }
  if (filters.depositMin || filters.depositMax) {
    chips.push({ key: 'deposit', label: 'محدوده رهن', clear: { depositMin: '', depositMax: '' } });
  }
  if (filters.rentMin || filters.rentMax) {
    chips.push({ key: 'rent', label: 'محدوده اجاره', clear: { rentMin: '', rentMax: '' } });
  }
  if (filters.rooms) {
    chips.push({ key: 'rooms', label: `${filters.rooms} خواب`, clear: { rooms: '' } });
  }
  if (filters.buildingAgeMax) {
    chips.push({
      key: 'buildingAgeMax',
      label: `سن بنا تا ${filters.buildingAgeMax}`,
      clear: { buildingAgeMax: '' },
    });
  }
  if (filters.floorMin || filters.floorMax) {
    chips.push({ key: 'floor', label: 'محدوده طبقه', clear: { floorMin: '', floorMax: '' } });
  }
  if (filters.fileCode.trim()) {
    chips.push({
      key: 'fileCode',
      label: `کد: ${filters.fileCode.trim()}`,
      clear: { fileCode: '' },
    });
  }
  if (filters.insertedDate) {
    chips.push({ key: 'insertedDate', label: 'تاریخ درج', clear: { insertedDate: '' } });
  }
  if (filters.amenities.length) {
    chips.push({ key: 'amenities', label: 'امکانات', clear: { amenities: [] } });
  }

  return chips;
}

export function filingBrowseExpandedFilterCount(filters: FilingBrowseFilters): number {
  let count = filingBrowseSheetFilterCount(filters);
  if (filters.posterKind !== 'all') count += 1;
  if (filters.dealType !== 'all') count += 1;
  if (filters.propertyKind !== 'all') count += 1;
  if (filters.neighborhoods.length) count += 1;
  if (filters.areaMin || filters.areaMax) count += 1;
  if (filters.priceMin || filters.priceMax) count += 1;
  if (filters.depositMin || filters.depositMax) count += 1;
  if (filters.rentMin || filters.rentMax) count += 1;
  return count;
}
