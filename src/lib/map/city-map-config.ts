import cityMapConfig from '@/data/geo/iran-cities-map-config.json';
import viewportsIndex from '@/data/geo/iran-location-viewports-index.json';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import { compactBboxToBusiness, type LocationViewportsIndex } from '@/lib/map/location-viewport-types';
import { haversineDistanceM } from '@/lib/map/intake-area-circle';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';

const VIEWPORT_INDEX = viewportsIndex as unknown as LocationViewportsIndex;

export type CityMapConfigEntry = {
  cityId: string;
  slug: string;
  name: string;
  provinceId: string;
  lat: number;
  lng: number;
  radiusM: number;
  bboxDelta: { lat: number; lng: number };
  pinBboxDelta?: { lat: number; lng: number };
  originCityId: string;
  originCitySlug: string;
  viewportCitySlug: string;
  mapZoom: number;
  source: 'divar' | 'centroid' | 'catalog' | 'fallback';
};

const CITIES = (cityMapConfig.cities ?? {}) as Record<string, CityMapConfigEntry>;
const BY_CITY_ID = new Map<string, CityMapConfigEntry>();

for (const entry of Object.values(CITIES)) {
  BY_CITY_ID.set(entry.cityId, entry);
}

function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim();
}

/** Map config for a browse URL slug, if known. */
export function getCityMapConfigBySlug(slug: string): CityMapConfigEntry | null {
  const s = normalizeSlug(slug);
  return CITIES[s] ?? CITIES[locationCityIdToSlug(s)] ?? null;
}

/** Map config by location-system city id. */
export function getCityMapConfigById(cityId: string): CityMapConfigEntry | null {
  return BY_CITY_ID.get(cityId) ?? getCityMapConfigBySlug(cityId);
}

/** Hub slug used for consistent map zoom/bbox (شهر مبدا). */
export function resolveViewportCitySlug(slug: string): string {
  const cfg = getCityMapConfigBySlug(slug);
  return cfg?.viewportCitySlug ?? normalizeSlug(slug);
}

/** Origin city id for a slug (defaults to self). */
export function resolveOriginCityId(slug: string): string | null {
  const cfg = getCityMapConfigBySlug(slug);
  return cfg?.originCityId ?? null;
}

/** Center for map pins / markers (actual city location). */
export function resolveCityMapPinCenter(slug: string): { lat: number; lng: number } | null {
  const cfg = getCityMapConfigBySlug(slug);
  if (!cfg) return null;
  return { lat: cfg.lat, lng: cfg.lng };
}

/** Viewport center — hub center for satellites so zoom feels consistent. */
export function resolveCityMapViewportCenter(slug: string): { lat: number; lng: number; zoom: number } | null {
  const cfg = getCityMapConfigBySlug(slug);
  if (!cfg) return null;
  const hub = getCityMapConfigBySlug(cfg.viewportCitySlug) ?? cfg;
  return { lat: hub.lat, lng: hub.lng, zoom: hub.mapZoom };
}

/** Metro viewport bbox (hub-sized). */
export function resolveCityMapBboxDelta(slug: string): { lat: number; lng: number } {
  const cfg = getCityMapConfigBySlug(slug);
  if (cfg) return cfg.bboxDelta;
  return { lat: 0.2, lng: 0.26 };
}

/** Per-city boundary bbox from own radius. */
export function resolveCityMapPinBboxDelta(slug: string): { lat: number; lng: number } {
  const cfg = getCityMapConfigBySlug(slug);
  if (cfg?.pinBboxDelta) return cfg.pinBboxDelta;
  if (cfg) {
    return {
      lat: (cfg.radiusM / 111_320) * 1.12,
      lng: (cfg.radiusM / (111_320 * Math.cos((cfg.lat * Math.PI) / 180))) * 1.12,
    };
  }
  return { lat: 0.14, lng: 0.18 };
}

export function resolveCityMapPinBbox(slug: string): BusinessMapBbox | null {
  const center = resolveCityMapPinCenter(slug);
  if (!center) return null;
  const delta = resolveCityMapPinBboxDelta(slug);
  return {
    south: center.lat - delta.lat,
    north: center.lat + delta.lat,
    west: center.lng - delta.lng,
    east: center.lng + delta.lng,
  };
}

export function resolveCityMapBbox(slug: string): BusinessMapBbox | null {
  const center = resolveCityMapViewportCenter(slug);
  if (!center) return null;
  const delta = resolveCityMapBboxDelta(slug);
  return {
    south: center.lat - delta.lat,
    north: center.lat + delta.lat,
    west: center.lng - delta.lng,
    east: center.lng + delta.lng,
  };
}

export function resolveCityMapMinZoom(slug: string): number {
  const cfg = getCityMapConfigBySlug(slug);
  if (!cfg) return 11;
  const hub = getCityMapConfigBySlug(cfg.viewportCitySlug) ?? cfg;
  return Math.max(10.5, hub.mapZoom - 0.5);
}

function lookupCityViewportBounds(slug: string): BusinessMapBbox | null {
  const s = normalizeSlug(slug);
  const entry = VIEWPORT_INDEX.cities[s] ?? VIEWPORT_INDEX.cities[locationCityIdToSlug(s)];
  if (!entry?.b) return null;
  return compactBboxToBusiness(entry.b);
}

/**
 * Scope ring center — aligned with OSM place labels on vector tiles.
 * Divar/catalog pins often sit east of the visible urban core on small/medium cities.
 */
export function resolveCityScopeRingCenter(slug: string): { lat: number; lng: number } | null {
  const pin = resolveCityMapPinCenter(slug);
  const pinBbox = resolveCityMapPinBbox(slug);
  if (!pin || !pinBbox) return pin;

  const nhBounds = lookupCityViewportBounds(slug);
  const west = nhBounds?.west ?? pinBbox.west;
  const east = nhBounds?.east ?? pinBbox.east;
  const south = nhBounds?.south ?? pinBbox.south;
  const north = nhBounds?.north ?? pinBbox.north;

  const spanLng = east - west;
  const spanLat = north - south;
  let lng = pin.lng;
  let lat = pin.lat;

  if (spanLng > 0) {
    const pinLngT = (pin.lng - west) / spanLng;
    // Tight metro footprints with an east-heavy catalog pin → shift west toward OSM label.
    if (pinLngT > 0.52 && spanLng < 0.12) {
      lng = pinBbox.west + (pin.lng - pinBbox.west) * 0.22;
    }
  }

  if (spanLat > 0) {
    const pinLatT = (pin.lat - south) / spanLat;
    if (pinLatT > 0.58) lat = south + spanLat * 0.45;
    else if (pinLatT < 0.42) lat = south + spanLat * 0.55;
  }

  return { lat, lng };
}

/** Radius that covers the scope ring center and catalog viewport extent. */
export function resolveCityScopeRingRadiusM(slug: string): number | null {
  const cfg = getCityMapConfigBySlug(slug);
  const center = resolveCityScopeRingCenter(slug);
  if (!cfg || !center) return cfg?.radiusM ?? null;

  let radiusM = cfg.radiusM;
  const bounds = lookupCityViewportBounds(slug) ?? resolveCityMapPinBbox(slug);
  if (!bounds) return radiusM;

  const corners: Array<{ lat: number; lng: number }> = [
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.south, lng: bounds.east },
    { lat: bounds.north, lng: bounds.west },
    { lat: bounds.north, lng: bounds.east },
  ];
  for (const corner of corners) {
    radiusM = Math.max(radiusM, haversineDistanceM(center.lat, center.lng, corner.lat, corner.lng));
  }
  return radiusM;
}
