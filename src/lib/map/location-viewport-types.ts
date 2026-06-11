import type { BusinessMapBbox } from '@/lib/business/map-pins-types';

/** Compact bbox: [west, south, east, north] */
export type CompactBbox = [number, number, number, number];

/** Compact center + zoom: [lat, lng, zoom] */
export type CompactCenterZoom = [number, number, number];

export type CompactNeighborhoodViewport = {
  c: [number, number];
  b: CompactBbox;
};

export type CityViewportChunk = {
  cityId: string;
  c: CompactCenterZoom;
  b: CompactBbox;
  n: Record<string, CompactNeighborhoodViewport>;
};

export type ProvinceViewportIndexEntry = {
  c: CompactCenterZoom;
  b: CompactBbox;
};

export type CityViewportIndexEntry = {
  cityId: string;
  provinceId: string;
  catalogCityId: string;
  c: CompactCenterZoom;
  b: CompactBbox;
};

export type LocationViewportsIndex = {
  generatedAt: string;
  provinces: Record<string, ProvinceViewportIndexEntry>;
  cities: Record<string, CityViewportIndexEntry>;
};

export type LocationViewportScope = 'national' | 'province' | 'city' | 'neighborhood';

export type LocationMapViewport = {
  scope: LocationViewportScope;
  center: { lat: number; lng: number; zoom: number };
  bounds: BusinessMapBbox | null;
  defaultPin: { lat: number; lng: number } | null;
};

export function compactBboxToBusiness(b: CompactBbox): BusinessMapBbox {
  return { west: b[0], south: b[1], east: b[2], north: b[3] };
}

export function businessBboxToCompact(b: BusinessMapBbox): CompactBbox {
  return [b.west, b.south, b.east, b.north];
}

export function compactCenterToObject(c: CompactCenterZoom): { lat: number; lng: number; zoom: number } {
  return { lat: c[0], lng: c[1], zoom: c[2] };
}

export function zoomFromBboxSpan(bounds: BusinessMapBbox): number {
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  const span = Math.max(latSpan, lngSpan);
  if (span > 0.025) return 13;
  if (span > 0.015) return 13.5;
  if (span > 0.01) return 14;
  if (span > 0.006) return 14.5;
  return 15;
}
