import type { CityViewportChunk } from '@/lib/map/location-viewport-types';

const chunkCache = new Map<string, CityViewportChunk>();
const inflight = new Map<string, Promise<CityViewportChunk | null>>();

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

/** Lazy-load per-city neighborhood viewport chunk (webpack context chunk). */
export async function loadCityViewportChunk(cityId: string): Promise<CityViewportChunk | null> {
  const cached = chunkCache.get(cityId);
  if (cached) return cached;

  const pending = inflight.get(cityId);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const mod = await import(`@/data/geo/viewports/cities/${cityId}.json`);
      const chunk = (mod.default ?? mod) as CityViewportChunk;
      chunkCache.set(cityId, chunk);
      return chunk;
    } catch {
      return null;
    } finally {
      inflight.delete(cityId);
    }
  })();

  inflight.set(cityId, promise);
  return promise;
}

export function prefetchCityViewportChunk(cityId: string): void {
  if (!cityId || chunkCache.has(cityId) || inflight.has(cityId)) return;
  void loadCityViewportChunk(cityId);
}
