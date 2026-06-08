import { IRAN_MAP_BOUNDS, tileIntersectsIran } from '@/lib/business/map-tile-iran';
import { listTilesInBbox, lon2tile, lat2tile, parseVectorTilePathParams } from '@/lib/map/vector/tile-math';

export { parseVectorTilePathParams, lon2tile, lat2tile };

/** Vector source tiles — MapLibre overzooms to browse z16. */
export const IRAN_VECTOR_TILE_MIN_ZOOM = 5;
export const IRAN_VECTOR_TILE_MAX_ZOOM = 14;

export const IRAN_VECTOR_BOUNDS = IRAN_MAP_BOUNDS;

export const IRAN_DIVAR_BROWSE_MAX_ZOOM = 16;
export const IRAN_DIVAR_CITY_MIN_ZOOM = 11;
export const IRAN_DIVAR_NATIONAL_MIN_ZOOM = 5;
/** Legacy alias ? vector detail ramps from {@link IRAN_VECTOR_DETAIL_RAMP_ZOOM}. */
export { IRAN_ADMIN_CITY_MIN_ZOOM as IRAN_DIVAR_DETAIL_MIN_ZOOM } from '@/lib/map/iran/zoom-tiers';
export { IRAN_VECTOR_DETAIL_RAMP_ZOOM } from '@/lib/map/iran/zoom-tiers';

export function tileIntersectsIranVector(z: number, x: number, y: number): boolean {
  if (z < IRAN_VECTOR_TILE_MIN_ZOOM || z > IRAN_VECTOR_TILE_MAX_ZOOM) return false;
  return tileIntersectsIran(z, x, y);
}

export function listIranVectorTileIndices(
  zMin = IRAN_VECTOR_TILE_MIN_ZOOM,
  zMax = IRAN_VECTOR_TILE_MAX_ZOOM
): Array<{ z: number; x: number; y: number }> {
  const { west, south, east, north } = IRAN_VECTOR_BOUNDS;
  return listTilesInBbox(west, south, east, north, zMin, zMax);
}
