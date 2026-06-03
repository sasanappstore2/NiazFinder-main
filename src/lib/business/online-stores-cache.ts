import type { OnlineStoreCategory } from '@/config/online-store-types';
import { DEFAULT_ONLINE_STORE_CATEGORIES } from '@/config/online-stores-defaults';

export type ManagedOnlineStoreCategory = OnlineStoreCategory & {
  isActive: boolean;
};

function normalizeCategory(c: OnlineStoreCategory): ManagedOnlineStoreCategory {
  return { ...c, isActive: c.isActive !== false };
}

let cache: ManagedOnlineStoreCategory[] | null = null;
let cacheAt = 0;

export function getDefaultManagedOnlineStores(): ManagedOnlineStoreCategory[] {
  return DEFAULT_ONLINE_STORE_CATEGORIES.map(normalizeCategory);
}

export function getCachedOnlineStoresSync(): ManagedOnlineStoreCategory[] {
  return cache ?? getDefaultManagedOnlineStores();
}

export function setOnlineStoresCache(data: ManagedOnlineStoreCategory[]): void {
  cache = data;
  cacheAt = Date.now();
}

export function invalidateOnlineStoresCache(): void {
  cache = null;
  cacheAt = 0;
}

export function getOnlineStoresCacheTimestamp(): number {
  return cacheAt;
}

export { normalizeCategory };
