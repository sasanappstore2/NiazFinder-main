import viewportsIndex from '@/data/geo/iran-location-viewports-index.json';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import {
  loadCityViewportChunk,
  prefetchCityViewportChunk,
} from '@/lib/map/location-viewport-cache';
import {
  compactBboxToBusiness,
  compactCenterToObject,
  type LocationMapViewport,
  type LocationViewportsIndex,
  type LocationViewportScope,
  zoomFromBboxSpan,
} from '@/lib/map/location-viewport-types';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import { provinceSlugToId } from '@/lib/search/province-slugs';

const INDEX = viewportsIndex as LocationViewportsIndex;

const NATIONAL_CENTER = { lat: 32.4279, lng: 53.688, zoom: 5.5 };

export type LocationViewportInput = {
  provinceId?: string | null;
  provinceSlug?: string | null;
  cityId?: string | null;
  citySlug?: string | null;
  neighborhoodId?: string | null;
};

function resolveProvinceId(input: LocationViewportInput): string | null {
  if (input.provinceId?.trim()) return input.provinceId.trim();
  if (input.provinceSlug?.trim()) return provinceSlugToId(input.provinceSlug.trim());
  return null;
}

function resolveCityKeys(input: LocationViewportInput): string[] {
  const keys: string[] = [];
  if (input.cityId?.trim()) keys.push(input.cityId.trim());
  if (input.citySlug?.trim()) keys.push(input.citySlug.trim());
  const slug = input.cityId ? locationCityIdToSlug(input.cityId) : null;
  if (slug && !keys.includes(slug)) keys.push(slug);
  return [...new Set(keys)];
}

function lookupCityEntry(input: LocationViewportInput) {
  for (const key of resolveCityKeys(input)) {
    const entry = INDEX.cities[key];
    if (entry) return entry;
  }
  return null;
}

function makeViewport(
  scope: LocationViewportScope,
  center: { lat: number; lng: number; zoom: number },
  bounds: BusinessMapBbox | null,
  defaultPin: { lat: number; lng: number } | null = null
): LocationMapViewport {
  return { scope, center, bounds, defaultPin: defaultPin ?? (bounds ? { lat: center.lat, lng: center.lng } : null) };
}

export function resolveLocationMapViewportSync(input: LocationViewportInput = {}): LocationMapViewport {
  const cityEntry = lookupCityEntry(input);
  if (cityEntry) {
    const bounds = compactBboxToBusiness(cityEntry.b);
    const center = compactCenterToObject(cityEntry.c);
    return makeViewport('city', center, bounds, { lat: center.lat, lng: center.lng });
  }

  const provinceId = resolveProvinceId(input);
  if (provinceId) {
    const entry = INDEX.provinces[provinceId];
    if (entry) {
      const bounds = compactBboxToBusiness(entry.b);
      const center = compactCenterToObject(entry.c);
      return makeViewport('province', center, bounds);
    }
  }

  return makeViewport('national', NATIONAL_CENTER, null, null);
}

function findNeighborhoodInChunk(
  chunk: Awaited<ReturnType<typeof loadCityViewportChunk>>,
  neighborhoodId: string
) {
  if (!chunk) return null;
  const trimmed = neighborhoodId.trim();
  if (!trimmed) return null;
  return chunk.n[trimmed] ?? chunk.n[decodeURIComponent(trimmed)] ?? null;
}

export async function resolveLocationMapViewport(
  input: LocationViewportInput = {}
): Promise<LocationMapViewport> {
  const neighborhoodId = input.neighborhoodId?.trim();
  const cityKeys = resolveCityKeys(input);
  const cityId = cityKeys[0];

  if (neighborhoodId && cityId) {
    prefetchCityViewportChunk(cityId);
    const chunk = await loadCityViewportChunk(cityId);
    const neighborhood = findNeighborhoodInChunk(chunk, neighborhoodId);
    if (neighborhood) {
      const bounds = compactBboxToBusiness(neighborhood.b);
      const center = {
        lat: neighborhood.c[0],
        lng: neighborhood.c[1],
        zoom: zoomFromBboxSpan(bounds),
      };
      return makeViewport('neighborhood', center, bounds, { lat: center.lat, lng: center.lng });
    }
  }

  return resolveLocationMapViewportSync(input);
}

/** Union bbox for multiple neighborhood ids within one city (browse maps). */
export async function resolveNeighborhoodsMapBounds(
  cityId: string,
  neighborhoodIds: string[]
): Promise<BusinessMapBbox | null> {
  if (!cityId || neighborhoodIds.length === 0) return null;

  const chunk = await loadCityViewportChunk(cityId);
  if (!chunk) return null;

  const boxes: BusinessMapBbox[] = [];
  for (const id of neighborhoodIds) {
    const n = findNeighborhoodInChunk(chunk, id);
    if (n) boxes.push(compactBboxToBusiness(n.b));
  }

  if (boxes.length === 0) return null;
  if (boxes.length === 1) return boxes[0]!;

  return {
    south: Math.min(...boxes.map((b) => b.south)),
    north: Math.max(...boxes.map((b) => b.north)),
    west: Math.min(...boxes.map((b) => b.west)),
    east: Math.max(...boxes.map((b) => b.east)),
  };
}

export { prefetchCityViewportChunk };
