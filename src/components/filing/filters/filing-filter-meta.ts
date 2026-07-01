import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Calendar,
  Car,
  Hash,
  Home,
  Layers,
  MapPinned,
  Ruler,
  Sparkles,
  Tag,
  UserCircle,
  Wallet,
} from 'lucide-react';
import type { FilingBrowseFilters } from '@/lib/filing/apply-filing-filters';
import { FILING_POSTER_KIND_OPTIONS } from '@/lib/filing/apply-filing-filters';
import {
  FILING_AMENITY_OPTIONS,
  FILING_KIND_CHIP_OPTIONS,
  FILING_ROOMS_OPTIONS,
} from '@/lib/filing/browse/filter-options';
import { filingFilterSpecForDeal } from '@/lib/filing/browse/filter-specs';
import { filingKindLabel } from '@/lib/filing/browse/categories';
import { toPersianDigits } from '@/lib/format/digits';
import type { FilingFilterOption } from '@/lib/filing/browse/filter-types';

export type FilingRailFilterKey =
  | 'neighborhoods'
  | 'propertyKind'
  | 'posterKind'
  | 'area'
  | 'price'
  | 'deposit'
  | 'rent'
  | 'rooms'
  | 'buildingAge'
  | 'floor'
  | 'amenities'
  | 'fileCode'
  | 'insertedDate';

export type FilingRailFilterKind = 'neighborhood' | 'chips' | 'range' | 'text' | 'date' | 'max';

export type FilingRailFilterMeta = {
  key: FilingRailFilterKey;
  label: string;
  kind: FilingRailFilterKind;
  icon: LucideIcon;
  options?: FilingFilterOption[];
  minKey?: keyof FilingBrowseFilters;
  maxKey?: keyof FilingBrowseFilters;
  singleKey?: keyof FilingBrowseFilters;
  isActive: (filters: FilingBrowseFilters) => boolean;
  summary: (filters: FilingBrowseFilters) => string | null;
  clearPatch: () => Partial<FilingBrowseFilters>;
};

function rangeSummary(min: string, max: string, unit = ''): string | null {
  const hasMin = Boolean(min.trim());
  const hasMax = Boolean(max.trim());
  if (!hasMin && !hasMax) return null;
  const fmt = (v: string) => toPersianDigits(v.trim()) + unit;
  if (hasMin && hasMax) return `${fmt(min)} – ${fmt(max)}`;
  if (hasMin) return `از ${fmt(min)}`;
  return `تا ${fmt(max)}`;
}

const BASE_RAIL_FILTERS: FilingRailFilterMeta[] = [
  {
    key: 'propertyKind',
    label: 'نوع ملک',
    kind: 'chips',
    icon: Home,
    options: FILING_KIND_CHIP_OPTIONS.filter((o) => o.value !== 'all').map((o) => ({
      value: o.value,
      label: o.label,
    })),
    singleKey: 'propertyKind',
    isActive: (f) => f.propertyKind !== 'all',
    summary: (f) =>
      f.propertyKind !== 'all'
        ? (filingKindLabel(f.propertyKind) ?? f.propertyKind)
        : null,
    clearPatch: () => ({ propertyKind: 'all' }),
  },
  {
    key: 'posterKind',
    label: 'نوع فایل',
    kind: 'chips',
    icon: UserCircle,
    options: FILING_POSTER_KIND_OPTIONS.filter((o) => o.value !== 'all').map((o) => ({
      value: o.value,
      label: o.label,
    })),
    singleKey: 'posterKind',
    isActive: (f) => f.posterKind !== 'all',
    summary: (f) =>
      FILING_POSTER_KIND_OPTIONS.find((o) => o.value === f.posterKind)?.label ?? null,
    clearPatch: () => ({ posterKind: 'all' }),
  },
  {
    key: 'area',
    label: 'متراژ',
    kind: 'range',
    icon: Ruler,
    minKey: 'areaMin',
    maxKey: 'areaMax',
    isActive: (f) => Boolean(f.areaMin || f.areaMax),
    summary: (f) => rangeSummary(f.areaMin, f.areaMax, ' متر'),
    clearPatch: () => ({ areaMin: '', areaMax: '' }),
  },
  {
    key: 'price',
    label: 'قیمت',
    kind: 'range',
    icon: Wallet,
    minKey: 'priceMin',
    maxKey: 'priceMax',
    isActive: (f) => Boolean(f.priceMin || f.priceMax),
    summary: (f) => rangeSummary(f.priceMin, f.priceMax),
    clearPatch: () => ({ priceMin: '', priceMax: '' }),
  },
  {
    key: 'deposit',
    label: 'رهن',
    kind: 'range',
    icon: Building2,
    minKey: 'depositMin',
    maxKey: 'depositMax',
    isActive: (f) => Boolean(f.depositMin || f.depositMax),
    summary: (f) => rangeSummary(f.depositMin, f.depositMax),
    clearPatch: () => ({ depositMin: '', depositMax: '' }),
  },
  {
    key: 'rent',
    label: 'اجاره',
    kind: 'range',
    icon: Tag,
    minKey: 'rentMin',
    maxKey: 'rentMax',
    isActive: (f) => Boolean(f.rentMin || f.rentMax),
    summary: (f) => rangeSummary(f.rentMin, f.rentMax),
    clearPatch: () => ({ rentMin: '', rentMax: '' }),
  },
  {
    key: 'rooms',
    label: 'خواب',
    kind: 'chips',
    icon: Layers,
    options: [...FILING_ROOMS_OPTIONS],
    singleKey: 'rooms',
    isActive: (f) => Boolean(f.rooms),
    summary: (f) =>
      f.rooms
        ? (FILING_ROOMS_OPTIONS.find((o) => o.value === f.rooms)?.label ?? `${f.rooms} خواب`)
        : null,
    clearPatch: () => ({ rooms: '' }),
  },
  {
    key: 'buildingAge',
    label: 'سن بنا',
    kind: 'max',
    icon: Calendar,
    singleKey: 'buildingAgeMax',
    isActive: (f) => Boolean(f.buildingAgeMax),
    summary: (f) =>
      f.buildingAgeMax ? `تا ${toPersianDigits(f.buildingAgeMax)} سال` : null,
    clearPatch: () => ({ buildingAgeMax: '' }),
  },
  {
    key: 'floor',
    label: 'طبقه',
    kind: 'range',
    icon: Layers,
    minKey: 'floorMin',
    maxKey: 'floorMax',
    isActive: (f) => Boolean(f.floorMin || f.floorMax),
    summary: (f) => rangeSummary(f.floorMin, f.floorMax),
    clearPatch: () => ({ floorMin: '', floorMax: '' }),
  },
  {
    key: 'amenities',
    label: 'امکانات',
    kind: 'chips',
    icon: Sparkles,
    options: [...FILING_AMENITY_OPTIONS],
    isActive: (f) => f.amenities.length > 0,
    summary: (f) => {
      if (!f.amenities.length) return null;
      if (f.amenities.length === 1) {
        return FILING_AMENITY_OPTIONS.find((o) => o.value === f.amenities[0])?.label ?? null;
      }
      return `${toPersianDigits(f.amenities.length)} مورد`;
    },
    clearPatch: () => ({ amenities: [] }),
  },
  {
    key: 'fileCode',
    label: 'کد فایل',
    kind: 'text',
    icon: Hash,
    singleKey: 'fileCode',
    isActive: (f) => Boolean(f.fileCode.trim()),
    summary: (f) => (f.fileCode.trim() ? f.fileCode.trim() : null),
    clearPatch: () => ({ fileCode: '' }),
  },
  {
    key: 'insertedDate',
    label: 'تاریخ درج',
    kind: 'date',
    icon: Calendar,
    singleKey: 'insertedDate',
    isActive: (f) => Boolean(f.insertedDate),
    summary: (f) => (f.insertedDate ? f.insertedDate : null),
    clearPatch: () => ({ insertedDate: '' }),
  },
];

const RAIL_KEY_TO_SPEC_KEYS: Record<FilingRailFilterKey, string[]> = {
  neighborhoods: ['region'],
  propertyKind: [],
  posterKind: [],
  area: ['areaMin', 'areaMax'],
  price: ['priceMin', 'priceMax'],
  deposit: ['depositMin', 'depositMax'],
  rent: ['rentMin', 'rentMax'],
  rooms: ['rooms'],
  buildingAge: ['buildingAgeMax'],
  floor: ['floorMin', 'floorMax'],
  amenities: ['amenities'],
  fileCode: ['fileCode'],
  insertedDate: ['insertedDate'],
};

export function filingRailFiltersForDeal(dealType: string): FilingRailFilterMeta[] {
  const spec = filingFilterSpecForDeal(dealType === 'all' ? 'all' : (dealType as never));
  const specKeys = new Set(spec.map((f) => f.key));

  return BASE_RAIL_FILTERS.filter((meta) => {
    if (meta.key === 'propertyKind' || meta.key === 'posterKind') return true;
    const keys = RAIL_KEY_TO_SPEC_KEYS[meta.key];
    return keys.some((k) => specKeys.has(k));
  });
}

export const FILING_NEIGHBORHOOD_META = {
  key: 'neighborhoods' as const,
  label: 'محله',
  icon: MapPinned,
};
