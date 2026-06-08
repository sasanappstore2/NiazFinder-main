import type { StyleSpecification } from 'maplibre-gl';
export type { StyleSpecification as MapStyleSpecification };
import type { BusinessMapThemeMode } from '@/lib/business/map-tiles';
import { resolveBusinessMapTileUrl } from '@/lib/business/map-tiles';
import { IRAN_MAP_BOUNDS } from '@/lib/business/map-tile-iran';
import { MAP_BROWSE_MAX_ZOOM, MAP_PIN_MAX_ZOOM } from '@/lib/map/tile-config';
import { IRAN_MAP_MIN_ZOOM } from '@/lib/map/iran-bounds';
import { IRAN_VIEW_BOUNDS_LNG_LAT } from '@/lib/map/iran/viewport-geo';

/** Mapbox access token ? only needed for optional Mapbox Studio vector styles. */
export function getMapboxAccessToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? '';
}

/** MapLibre (free) by default; Mapbox only when Studio vector style + token are configured. */
export function resolveMapEngine(): 'maplibre' | 'mapbox' {
  const token = getMapboxAccessToken();
  const vectorStyle = getMapboxStyleUrl();
  if (token && vectorStyle) return 'mapbox';
  return 'maplibre';
}

/** Optional Mapbox Studio vector style (Snapp/Balad-class). Falls back to self-hosted Iran raster. */
export function getMapboxStyleUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL?.trim();
  return url || null;
}

export const IRAN_MAX_BOUNDS_LNG_LAT = IRAN_VIEW_BOUNDS_LNG_LAT;

export function resolveMapMaxZoom(detail: 'browse' | 'picker'): number {
  return detail === 'picker' ? MAP_PIN_MAX_ZOOM : MAP_BROWSE_MAX_ZOOM;
}

export function resolveMapMinZoom(): number {
  return IRAN_MAP_MIN_ZOOM;
}

function tileTemplateForTheme(theme: BusinessMapThemeMode): string {
  if (typeof window !== 'undefined') {
    const path = resolveBusinessMapTileUrl(theme);
    return `${window.location.origin}${path}`;
  }
  return resolveBusinessMapTileUrl(theme);
}

/** Raster Iran tiles via existing `/api/map/tiles` proxy (memaps upstream + disk cache). */
export function buildIranRasterMapStyle(theme: BusinessMapThemeMode): StyleSpecification {
  const tiles = [tileTemplateForTheme(theme)];
  return {
    version: 8,
    sources: {
      'niazfinder-iran': {
        type: 'raster',
        tiles,
        tileSize: 256,
        bounds: [
          IRAN_MAP_BOUNDS.west,
          IRAN_MAP_BOUNDS.south,
          IRAN_MAP_BOUNDS.east,
          IRAN_MAP_BOUNDS.north,
        ],
        attribution:
          '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> \u00b7 \u0645\u06cc\u200c\u0645\u067e\u0633',
      },
    },
    layers: [
      {
        id: 'niazfinder-iran-raster',
        type: 'raster',
        source: 'niazfinder-iran',
        minzoom: IRAN_MAP_MIN_ZOOM,
        maxzoom: MAP_PIN_MAX_ZOOM,
      },
    ],
  };
}

export function resolveMapStyle(theme: BusinessMapThemeMode): string | StyleSpecification {
  const vectorStyle = getMapboxStyleUrl();
  if (vectorStyle) return vectorStyle;
  return buildIranRasterMapStyle(theme);
}
