import type { BusinessMapThemeMode } from '@/lib/business/map-tiles';

/** Browse maps — avoid alley/building micro-detail (Divar-style). */
export const MAP_BROWSE_MAX_ZOOM = 16;

/** Intake / profile pin placement — slightly more detail. */
export const MAP_PIN_MAX_ZOOM = 17;

export type MapTileStyle = BusinessMapThemeMode;

/** Primary raster: memaps (نقشه فارسی پروژه). */
export const MAP_TILE_UPSTREAM_BY_STYLE: Record<MapTileStyle, string> = {
  light: 'https://memaps.ir/light/{z}/{x}/{y}.png',
  dark: 'https://memaps.ir/dark/{z}/{x}/{y}.png',
};

/** Fallback when memaps is unreachable — keeps raster usable without touching vector map. */
export const MAP_TILE_FALLBACK_CHAIN: Record<MapTileStyle, readonly string[]> = {
  light: [
    'https://memaps.ir/hot/{z}/{x}/{y}.png',
    'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  ],
  dark: [
    'https://memaps.ir/hot/{z}/{x}/{y}.png',
    'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  ],
};

/** @deprecated Use resolveMapTileUpstreamChain */
export const MAP_TILE_UPSTREAM_FALLBACK = MAP_TILE_FALLBACK_CHAIN.light[0]!;

export function normalizeMapTileStyle(raw: string | null | undefined): MapTileStyle {
  return raw === 'dark' ? 'dark' : 'light';
}

export function resolveMapTileUpstream(style: MapTileStyle): string {
  return resolveMapTileUpstreamChain(style)[0]!;
}

export function resolveMapTileUpstreamChain(style: MapTileStyle): string[] {
  const chain: string[] = [];
  const envKey = style === 'dark' ? 'MAP_TILE_UPSTREAM_DARK_URL' : 'MAP_TILE_UPSTREAM_LIGHT_URL';
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) chain.push(fromEnv);

  const shared = process.env.MAP_TILE_UPSTREAM_URL?.trim();
  if (shared) chain.push(shared);

  chain.push(MAP_TILE_UPSTREAM_BY_STYLE[style]);
  chain.push(...MAP_TILE_FALLBACK_CHAIN[style]);

  const extra = process.env.MAP_TILE_UPSTREAM_FALLBACK_URL?.trim();
  if (extra) chain.push(extra);

  return [...new Set(chain.filter(Boolean))];
}

/** @deprecated Use resolveMapTileUpstreamChain */
export function resolveMapTileFallbackUpstream(): string {
  const chain = resolveMapTileUpstreamChain('light');
  return chain[1] ?? chain[0]!;
}
