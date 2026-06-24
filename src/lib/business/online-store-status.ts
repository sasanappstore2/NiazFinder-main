import type { OnlineStoreCategory } from '@/config/online-store-types';

/** Launch policy: no online-store vertical at launch (real-estate occupations only). */
export function getLaunchIsActiveForOnlineStore(_c: Pick<OnlineStoreCategory, 'slug' | 'parentSlug' | 'depth'>): boolean {
  return false;
}

export function isOnlineStorePubliclyAvailable(isActive: boolean | undefined): boolean {
  return isActive !== false;
}
