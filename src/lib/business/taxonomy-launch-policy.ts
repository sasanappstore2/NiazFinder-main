import type { BusinessOccupation } from '@/config/business-occupation-types';
import type { OnlineStoreCategory } from '@/config/online-store-types';
import { getLaunchIsActiveForOccupation } from '@/lib/business/occupation-status';
import { getLaunchIsActiveForOnlineStore } from '@/lib/business/online-store-status';
import type { ManagedBusinessOccupation } from '@/lib/business/occupations-cache';
import type { ManagedOnlineStoreCategory } from '@/lib/business/online-stores-cache';

/** Bump when launch defaults change; triggers one-time migration of persisted JSON registries. */
export const BUSINESS_TAXONOMY_LAUNCH_POLICY_VERSION = 1;

export function applyLaunchPolicyToOccupations(
  occupations: ManagedBusinessOccupation[]
): ManagedBusinessOccupation[] {
  return occupations.map((o) => ({
    ...o,
    isActive: getLaunchIsActiveForOccupation(o as Pick<BusinessOccupation, 'slug' | 'parentSlug' | 'depth'>),
  }));
}

export function applyLaunchPolicyToOnlineStores(
  categories: ManagedOnlineStoreCategory[]
): ManagedOnlineStoreCategory[] {
  return categories.map((c) => ({
    ...c,
    isActive: getLaunchIsActiveForOnlineStore(c as Pick<OnlineStoreCategory, 'slug' | 'parentSlug' | 'depth'>),
  }));
}
