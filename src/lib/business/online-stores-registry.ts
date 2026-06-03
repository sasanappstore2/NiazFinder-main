import { promises as fs } from 'fs';
import path from 'path';
import type { OnlineStoreCategory } from '@/config/online-store-types';
import {
  getDefaultManagedOnlineStores,
  getCachedOnlineStoresSync,
  setOnlineStoresCache,
  invalidateOnlineStoresCache,
  normalizeCategory,
  getOnlineStoresCacheTimestamp,
  type ManagedOnlineStoreCategory,
} from '@/lib/business/online-stores-cache';

export type { ManagedOnlineStoreCategory } from '@/lib/business/online-stores-cache';

export type ManagedOnlineStoresData = {
  categories: ManagedOnlineStoreCategory[];
  updatedAt: string;
};

const filePath = path.join(process.cwd(), 'src', 'data', 'online-stores.json');
const CACHE_TTL_MS = 60_000;

function parseManagedData(raw: unknown): ManagedOnlineStoreCategory[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeCategory(item as OnlineStoreCategory));
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as ManagedOnlineStoresData).categories)) {
    return (raw as ManagedOnlineStoresData).categories.map(normalizeCategory);
  }
  return getDefaultManagedOnlineStores();
}

export {
  getDefaultManagedOnlineStores,
  getCachedOnlineStoresSync,
  setOnlineStoresCache,
  invalidateOnlineStoresCache,
} from '@/lib/business/online-stores-cache';

export async function readManagedOnlineStores(): Promise<ManagedOnlineStoreCategory[]> {
  const cacheAt = getOnlineStoresCacheTimestamp();
  const now = Date.now();
  if (cacheAt > 0 && now - cacheAt < CACHE_TTL_MS) {
    return getCachedOnlineStoresSync();
  }

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const data = parseManagedData(parsed);
    setOnlineStoresCache(data);
    return data;
  } catch {
    const data = getDefaultManagedOnlineStores();
    setOnlineStoresCache(data);
    return data;
  }
}

export async function writeManagedOnlineStores(
  categories: ManagedOnlineStoreCategory[]
): Promise<ManagedOnlineStoresData> {
  const next: ManagedOnlineStoresData = {
    categories: categories.map(normalizeCategory),
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(next, null, 2), 'utf8');
  setOnlineStoresCache(next.categories);
  return next;
}

export async function warmOnlineStoresCache(): Promise<ManagedOnlineStoreCategory[]> {
  invalidateOnlineStoresCache();
  return readManagedOnlineStores();
}
