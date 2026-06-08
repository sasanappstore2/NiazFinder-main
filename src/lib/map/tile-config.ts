import type { BusinessMapThemeMode } from '@/lib/business/map-tiles';

/** Browse maps ? avoid alley/building micro-detail (Divar-style). */
export const MAP_BROWSE_MAX_ZOOM = 16;

/** Intake / profile pin placement ? slightly more detail. */
export const MAP_PIN_MAX_ZOOM = 17;

export type MapTileStyle = BusinessMapThemeMode;

/** memaps raster stacks ? lighter than `hot` for classifieds browse. */
export const MAP_TILE_UPSTREAM_BY_STYLE: Record<MapTileStyle, string> = {
  light: 'https://memaps.ir/light/{z}/{x}/{y}.png',
  dark: 'https://memaps.ir/dark/{z}/{x}/{y}.png',
};

/** Last-resort upstream when style-specific tiles are unavailable. */
export const MAP_TILE_UPSTREAM_FALLBACK = 'https://memaps.ir/hot/{z}/{x}/{y}.png';

export function normalizeMapTileStyle(raw: string | null | undefined): MapTileStyle {
  return raw === 'dark' ? 'dark' : 'light';
}

export function resolveMapTileUpstream(style: MapTileStyle): string {
  const envKey = style === 'dark' ? 'MAP_TILE_UPSTREAM_DARK_URL' : 'MAP_TILE_UPSTREAM_LIGHT_URL';
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;

  const shared = process.env.MAP_TILE_UPSTREAM_URL?.trim();
  if (shared) return shared;

  return MAP_TILE_UPSTREAM_BY_STYLE[style];
}

export function resolveMapTileFallbackUpstream(): string {
  return process.env.MAP_TILE_UPSTREAM_FALLBACK_URL?.trim() || MAP_TILE_UPSTREAM_FALLBACK;
}
