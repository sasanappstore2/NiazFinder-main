export type BusinessMapThemeMode = 'light' | 'dark';

/**
 * Raster fallback tiles (memaps primary, Carto/OSM chain) — disk-cached under data/map-tiles-cache.
 * Default map surface is Iran Divar vector via `/api/map/vector/iran`.
 */
export function resolveBusinessMapTileUrl(theme: BusinessMapThemeMode = 'light'): string {
  return `/api/map/tiles/{z}/{x}/{y}?theme=${theme}`;
}

/** @deprecated Use resolveBusinessMapTileUrl(theme) */
export const BUSINESS_MAP_TILE_INTERNAL_URL = resolveBusinessMapTileUrl('light');

export const BUSINESS_MAP_TILE_ATTRIBUTION =
  '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> \u00b7 <a href="https://carto.com/attributions">CARTO</a> \u00b7 NiazFinder';

export function resolveBusinessMapTileAttribution(): string {
  return BUSINESS_MAP_TILE_ATTRIBUTION;
}
