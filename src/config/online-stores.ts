/**
 * Online store / e-commerce vertical taxonomy for Iran market.
 * Runtime registry: src/data/online-stores.json (admin-editable).
 * Fallback: online-stores-defaults.ts
 * See docs/ONLINE_STORE_CATEGORIES.md
 */

export type { OnlineStoreCategory } from '@/config/online-store-types';
export { DEFAULT_ONLINE_STORE_CATEGORIES } from '@/config/online-stores-defaults';

import type { OnlineStoreCategory } from '@/config/online-store-types';
import { getCachedOnlineStoresSync } from '@/lib/business/online-stores-cache';

function activeCategories(): OnlineStoreCategory[] {
  return getCachedOnlineStoresSync().filter((c) => c.isActive !== false);
}

function allCategories(): OnlineStoreCategory[] {
  return getCachedOnlineStoresSync();
}

function buildMaps(list: OnlineStoreCategory[]) {
  const bySlug = new Map(list.map((c) => [c.slug, c]));
  const allSlugs = new Set(list.map((c) => c.slug));
  return { bySlug, allSlugs };
}

export function getOnlineStoreCategoriesList(): OnlineStoreCategory[] {
  return activeCategories();
}

function categorySortKey(c: OnlineStoreCategory): number {
  return c.sortOrder ?? 9999;
}

export function compareOnlineStoresByDisplayOrder(
  a: OnlineStoreCategory,
  b: OnlineStoreCategory
): number {
  const byOrder = categorySortKey(a) - categorySortKey(b);
  if (byOrder !== 0) return byOrder;
  return a.title.localeCompare(b.title, 'fa');
}

export function isOnlineStoreSlug(slug: string): boolean {
  const { allSlugs } = buildMaps(allCategories());
  return allSlugs.has(slug.trim());
}

export function getOnlineStoreBySlug(slug: string): OnlineStoreCategory | null {
  const { bySlug } = buildMaps(allCategories());
  return bySlug.get(slug.trim()) ?? null;
}

export function getOnlineStorePath(slug: string): OnlineStoreCategory[] {
  const { bySlug } = buildMaps(allCategories());
  const path: OnlineStoreCategory[] = [];
  let cursor: OnlineStoreCategory | null = bySlug.get(slug.trim()) ?? null;
  let safety = 4;
  while (cursor && safety-- > 0) {
    path.unshift(cursor);
    cursor = cursor.parentSlug ? bySlug.get(cursor.parentSlug) ?? null : null;
  }
  return path;
}

export function isAncestorOnlineStore(parent: string, child: string): boolean {
  const path = getOnlineStorePath(child);
  return path.some((c) => c.slug === parent && c.slug !== child);
}

export function getPickableOnlineStores(): OnlineStoreCategory[] {
  return activeCategories().filter((c) => c.depth === 1).sort(compareOnlineStoresByDisplayOrder);
}

export function getOnlineStoreSectors(): OnlineStoreCategory[] {
  return activeCategories().filter((c) => c.depth === 0).sort(compareOnlineStoresByDisplayOrder);
}

export function getOnlineStoreTitle(slug: string): string {
  return getOnlineStoreBySlug(slug)?.title ?? slug;
}

export function isPickableOnlineStoreSlug(slug: string): boolean {
  const c = getOnlineStoreBySlug(slug);
  return c != null && c.depth === 1 && c.isActive !== false;
}

export function getPickableOnlineStoreCount(): number {
  return getPickableOnlineStores().length;
}

/** @deprecated Use getOnlineStoreSectors().map(c => c.slug) */
export const ONLINE_STORE_SECTOR_SLUGS: readonly string[] = getOnlineStoreSectors().map((c) => c.slug);
