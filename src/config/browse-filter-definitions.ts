import type { ListingType } from '@/lib/filters/parser';
import { getFiltersForCategory } from '@/config/category-filters/registry';
import type { CategoryFilterField } from '@/config/category-filters/types';

/** @deprecated Use CategoryFilterField from category-filters registry. */
export interface BrowseFilterDefinition {
  key: string;
  label: string;
  kind: 'toggle' | 'popover' | 'select';
}

export const DEAL_TYPE_OPTIONS = [
  { value: 'buy', label: 'خرید' },
  { value: 'sell', label: 'فروش' },
  { value: 'rent_monthly', label: 'اجاره ماهانه' },
  { value: 'rent_rahn_full', label: 'رهن کامل' },
  { value: 'rent_rahn_ejare', label: 'رهن و اجاره' },
];

export const SORT_OPTIONS_NEED = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'oldest', label: 'قدیمی‌ترین' },
  { value: 'price-asc', label: 'قیمت: کم به زیاد' },
  { value: 'price-desc', label: 'قیمت: زیاد به کم' },
  { value: 'popular', label: 'پربازدید' },
];

export const SORT_OPTIONS_BUSINESS = [
  { value: 'rating', label: 'بیشترین امتیاز' },
  { value: 'newest', label: 'جدیدترین' },
  { value: 'popular', label: 'پربازدید' },
];

export const RECENT_OPTIONS = [
  { value: '', label: 'همه زمان‌ها' },
  { value: '24h', label: '۲۴ ساعت اخیر' },
  { value: '7d', label: '۷ روز اخیر' },
  { value: '30d', label: '۳۰ روز اخیر' },
];

/** Legacy adapter — maps registry browse fields to old definition shape. */
export function getFiltersForCategoryRoot(
  rootSlug: string | null,
  listingType: ListingType
): BrowseFilterDefinition[] {
  const { browseFields } = getFiltersForCategory(rootSlug, listingType);
  return browseFields.map(registryFieldToLegacy);
}

function registryFieldToLegacy(f: CategoryFilterField): BrowseFilterDefinition {
  if (f.globalKey === 'price') return { key: 'price', label: f.label, kind: 'popover' };
  if (f.globalKey === 'sort') return { key: 'sort', label: f.label, kind: 'select' };
  if (f.key === 'dealType') return { key: 'dealType', label: f.label, kind: 'select' };
  const kind =
    f.kind === 'chips' || f.kind === 'select' ? 'select' : f.kind === 'toggle' ? 'toggle' : 'popover';
  return { key: f.key, label: f.label, kind };
}
