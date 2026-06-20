import type { CityViewportChunk, LocationViewportsIndex } from '@/lib/map/location-viewport-types';
import viewportsIndex from '@/data/geo/iran-location-viewports-index.json';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';

const INDEX = viewportsIndex as unknown as LocationViewportsIndex;

const chunkCache = new Map<string, CityViewportChunk>();
const inflight = new Map<string, Promise<CityViewportChunk | null>>();

const VIEWPORT_API = '/api/geo/viewport';

function resolveChunkId(cityId: string): string {
  const keys = [...new Set([cityId, locationCityIdToSlug(cityId)].filter(Boolean))];
  for (const key of keys) {
    const entry = INDEX.cities[key];
    if (entry?.catalogCityId) return entry.catalogCityId;
    if (entry?.cityId) return entry.cityId;
  }
  return cityId;
}

export function getCachedCityViewportChunk(cityId: string): CityViewportChunk | null {
  return chunkCache.get(cityId) ?? null;
}

export function setCachedCityViewportChunk(cityId: string, chunk: CityViewportChunk): void {
  chunkCache.set(cityId, chunk);
}

export function clearCityViewportChunkCache(): void {
  chunkCache.clear();
  inflight.clear();
}

function chunkCacheKey(cityId: string): string {
  return resolveChunkId(cityId);
}

async function fetchViewportChunk(chunkId: string): Promise<CityViewportChunk | null> {
  const res = await fetch(`${VIEWPORT_API}/${encodeURIComponent(chunkId)}`, {
    cache: 'force-cache',
  });
  if (!res.ok) return null;
  return (await res.json()) as CityViewportChunk;
}

/** Lazy-load per-city neighborhood viewport chunk via API (no webpack context chunk). */
export async function loadCityViewportChunk(cityId: string): Promise<CityViewportChunk | null> {
  const chunkId = chunkCacheKey(cityId);
  const cached = chunkCache.get(chunkId);
  if (cached) return cached;

  const pending = inflight.get(chunkId);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const chunk = await fetchViewportChunk(chunkId);
      if (!chunk) return null;
      chunkCache.set(chunkId, chunk);
      if (chunkId !== cityId) chunkCache.set(cityId, chunk);
      return chunk;
    } catch {
      return null;
    } finally {
      inflight.delete(chunkId);
    }
  })();

  inflight.set(chunkId, promise);
  return promise;
}

export function prefetchCityViewportChunk(cityId: string): void {
  const chunkId = chunkCacheKey(cityId);
  if (!chunkId || chunkCache.has(chunkId) || inflight.has(chunkId)) return;
  void loadCityViewportChunk(cityId);
}
