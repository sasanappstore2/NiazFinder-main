/**
 * Unified lookup for business profile categories: occupations + online stores.
 */
import {
  getOccupationTitle,
  isOccupationSlug,
  isPickableOccupationSlug,
} from '@/config/business-occupations';
import {
  getOnlineStoreTitle,
  isOnlineStoreSlug,
  isPickableOnlineStoreSlug,
} from '@/config/online-stores';

export function isPickableProfileCategorySlug(slug: string): boolean {
  return isPickableOccupationSlug(slug) || isPickableOnlineStoreSlug(slug);
}

export function getBusinessCategoryTitle(slug: string): string {
  if (isOnlineStoreSlug(slug)) return getOnlineStoreTitle(slug);
  return getOccupationTitle(slug);
}

export function getBusinessCategoryKind(slug: string): 'online-store' | 'occupation' | 'unknown' {
  if (isPickableOnlineStoreSlug(slug)) return 'online-store';
  if (isPickableOccupationSlug(slug)) return 'occupation';
  if (isOnlineStoreSlug(slug)) return 'online-store';
  if (isOccupationSlug(slug)) return 'occupation';
  return 'unknown';
}

/** Display label for chips (شغل vs فروشگاه آنلاین). */
export function getBusinessCategoryKindLabel(slug: string): string {
  return getBusinessCategoryKind(slug) === 'online-store' ? 'فروشگاه آنلاین' : 'شغل';
}

/** SEO-facing title segment (online stores get «فروشگاه اینترنتی» prefix). */
export function getBusinessCategorySeoSegment(slug: string): string {
  const title = getBusinessCategoryTitle(slug);
  if (getBusinessCategoryKind(slug) === 'online-store') {
    return `فروشگاه اینترنتی ${title}`;
  }
  return title;
}

export const MAX_PROFILE_CATEGORY_SELECTIONS = 3;
