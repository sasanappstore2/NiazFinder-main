import { CANONICAL_CITIES } from '@/config/locations';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import {
  prefetchCityViewportChunk,
  resolveLocationMapViewport,
  resolveLocationMapViewportSync,
} from '@/lib/map/location-viewport-resolver';
import { resolveIranCityById, resolveIranCityByName } from '@/lib/need-intake/iran-location-resolver';
import type { ManagedNeighborhood } from '@/lib/locations/managed-types';
import cityMapConfig from '@/data/geo/iran-cities-map-config.json';

const CITIES_BY_NAME = new Map(
  Object.values(cityMapConfig.cities ?? {}).map((c) => [c.name, c.slug])
);

export function resolveIntakeCitySlug(cityLabel: string): string | null {
  const trimmed = cityLabel.trim();
  if (!trimmed) return null;
  const canonical = CANONICAL_CITIES.find((c) => c.title === trimmed);
  if (canonical) return canonical.slug;
  const fromMapConfig = CITIES_BY_NAME.get(trimmed);
  if (fromMapConfig) return fromMapConfig;
  const iran = resolveIranCityByName(trimmed) ?? resolveIranCityById(trimmed);
  if (iran) return iran.id;
  return null;
}

export function managedNeighborhoodToMapBbox(
  neighborhood: ManagedNeighborhood | null | undefined
): BusinessMapBbox | null {
  const bbox = neighborhood?.bbox;
  if (!bbox) return null;
  return {
    south: bbox.south,
    north: bbox.north,
    west: bbox.west,
    east: bbox.east,
  };
}

export function resolveIntakeMapViewport(
  cityLabel: string,
  neighborhood?: ManagedNeighborhood | null
): { lat: number; lng: number; zoom: number } {
  const citySlug = resolveIntakeCitySlug(cityLabel);
  if (neighborhood?.id && citySlug) {
    prefetchCityViewportChunk(citySlug);
  }

  const sync = resolveLocationMapViewportSync({
    cityId: citySlug ?? undefined,
    citySlug: citySlug ?? undefined,
    neighborhoodId: neighborhood?.id,
  });

  if (sync.scope === 'neighborhood') {
    return sync.center;
  }

  if (neighborhood?.bbox || neighborhood?.centroid) {
    const bounds = managedNeighborhoodToMapBbox(neighborhood);
    if (bounds && neighborhood.centroid) {
      return {
        lat: neighborhood.centroid.lat,
        lng: neighborhood.centroid.lng,
        zoom: sync.center.zoom,
      };
    }
  }

  return sync.center;
}

export function resolveIntakeMapFrameBounds(
  cityLabel: string,
  neighborhood?: ManagedNeighborhood | null
): {
  cityBounds: BusinessMapBbox | null;
  neighborhoodBounds: BusinessMapBbox | null;
  center: { lat: number; lng: number; zoom: number };
} {
  const citySlug = resolveIntakeCitySlug(cityLabel);
  const cityViewport = resolveLocationMapViewportSync({
    cityId: citySlug ?? undefined,
    citySlug: citySlug ?? undefined,
  });

  const neighborhoodBounds = managedNeighborhoodToMapBbox(neighborhood);
  const center = resolveIntakeMapViewport(cityLabel, neighborhood);

  return {
    cityBounds: cityViewport.bounds,
    neighborhoodBounds,
    center,
  };
}

export async function resolveIntakeMapFrameBoundsAsync(
  cityLabel: string,
  neighborhood?: ManagedNeighborhood | null
): Promise<{
  cityBounds: BusinessMapBbox | null;
  neighborhoodBounds: BusinessMapBbox | null;
  center: { lat: number; lng: number; zoom: number };
  defaultPin: { lat: number; lng: number } | null;
}> {
  const citySlug = resolveIntakeCitySlug(cityLabel);
  const viewport = await resolveLocationMapViewport({
    cityId: citySlug ?? undefined,
    citySlug: citySlug ?? undefined,
    neighborhoodId: neighborhood?.id,
  });

  const cityBounds =
    viewport.scope === 'neighborhood' && citySlug
      ? resolveLocationMapViewportSync({ cityId: citySlug, citySlug }).bounds
      : viewport.scope === 'city'
        ? viewport.bounds
        : null;

  return {
    cityBounds,
    neighborhoodBounds: viewport.scope === 'neighborhood' ? viewport.bounds : managedNeighborhoodToMapBbox(neighborhood),
    center: viewport.center,
    defaultPin: viewport.defaultPin,
  };
}
