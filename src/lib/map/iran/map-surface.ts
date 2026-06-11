/** Which tile surface to render when MapLibre is the active engine. */
export type IranMapSurface = 'raster' | 'vector';

/**
 * Vector = self-hosted Divar-style Iran map (`/api/map/vector/iran`, local cache).
 * Raster = memaps/Carto via `/api/map/tiles` — fallback when vector errors or
 * `NEXT_PUBLIC_MAP_SURFACE=raster`.
 */
export function resolveIranMapSurface(_detail: 'browse' | 'picker'): IranMapSurface {
  const forced = process.env.NEXT_PUBLIC_MAP_SURFACE?.trim().toLowerCase();
  if (forced === 'raster') return 'raster';
  if (forced === 'vector') return 'vector';
  return 'vector';
}
