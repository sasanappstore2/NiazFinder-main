import type { BusinessMapBbox } from '@/lib/business/map-pins-types';

/** Max viewport span accepted by map-pins API (country-wide browse at low zoom). */
export const MAP_PINS_MAX_BBOX_SPAN = 42;

export function isValidMapBbox(bbox: BusinessMapBbox): boolean {
  const { west, south, east, north } = bbox;
  if (![west, south, east, north].every(Number.isFinite)) return false;
  if (west >= east || south >= north) return false;
  if (Math.abs(north - south) > MAP_PINS_MAX_BBOX_SPAN) return false;
  if (Math.abs(east - west) > MAP_PINS_MAX_BBOX_SPAN) return false;
  return true;
}

/** Clamp oversized viewports instead of dropping the request (e.g. Iran at zoom 5). */
export function normalizeMapBbox(bbox: BusinessMapBbox): BusinessMapBbox | null {
  if (![bbox.west, bbox.south, bbox.east, bbox.north].every(Number.isFinite)) {
    return null;
  }

  let { west, south, east, north } = bbox;
  if (west >= east || south >= north) return null;

  const latSpan = north - south;
  const lngSpan = east - west;

  if (latSpan > MAP_PINS_MAX_BBOX_SPAN) {
    const mid = (north + south) / 2;
    const half = MAP_PINS_MAX_BBOX_SPAN / 2;
    south = mid - half;
    north = mid + half;
  }

  if (lngSpan > MAP_PINS_MAX_BBOX_SPAN) {
    const mid = (east + west) / 2;
    const half = MAP_PINS_MAX_BBOX_SPAN / 2;
    west = mid - half;
    east = mid + half;
  }

  return { west, south, east, north };
}
