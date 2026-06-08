export type BusinessMapThemeMode = 'light' | 'dark';

/**
 * Self-hosted Iran tiles (memaps upstream per theme, disk-cached under data/map-tiles-cache).
 */
export function resolveBusinessMapTileUrl(theme: BusinessMapThemeMode = 'light'): string {
  return `/api/map/tiles/{z}/{x}/{y}?theme=${theme}`;
}

/** @deprecated Use resolveBusinessMapTileUrl(theme) */
export const BUSINESS_MAP_TILE_INTERNAL_URL = resolveBusinessMapTileUrl('light');

export const BUSINESS_MAP_TILE_ATTRIBUTION =
  '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> \u00b7 \u0645\u06cc\u200c\u0645\u067e\u0633 \u00b7 NiazFinder';

export function resolveBusinessMapTileAttribution(): string {
  return BUSINESS_MAP_TILE_ATTRIBUTION;
}
