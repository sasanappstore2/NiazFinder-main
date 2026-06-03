import { getOccupationTitle } from '@/config/business-occupations';
import { getOnlineStoreTitle } from '@/config/online-stores';
import { getCategoryBySlug } from '@/config/categories';
import { cityLabel, provinceLabel } from '@/lib/analytics/geo-location-index';

const MARKET_LABELS: Record<string, string> = {
  need: 'نیاز',
  business: 'کسب‌وکار',
};

export function dimensionLabel(dim: string, value: string): string {
  if (value === '(not set)') return 'تعریف‌نشده';
  switch (dim) {
    case 'market':
      return MARKET_LABELS[value] ?? value;
    case 'city':
    case 'citySlug':
      return cityLabel(value);
    case 'province':
      return provinceLabel(value);
    case 'needCategory':
      return getCategoryBySlug(value)?.title ?? value;
    case 'occupation':
      return getOccupationTitle(value) ?? value;
    case 'onlineStore':
      return getOnlineStoreTitle(value) ?? value;
    default:
      return value;
  }
}

export function resolveDimensionLabel(dim: string, value: string): string {
  return dimensionLabel(dim, value);
}
