import { IRAN_MAP_BOUNDS } from '@/lib/business/map-tile-iran';

/** Minimum zoom — keeps Iran in frame without showing neighboring countries. */
export const IRAN_MAP_MIN_ZOOM = 5;

/** Tile bounds — tiles outside Iran are not requested. */
export const IRAN_MAP_TILE_BOUNDS: [[number, number], [number, number]] = [
  [IRAN_MAP_BOUNDS.south, IRAN_MAP_BOUNDS.west],
  [IRAN_MAP_BOUNDS.north, IRAN_MAP_BOUNDS.east],
];

/** Pan limits with slight padding so the map edge does not feel clipped. */
export const IRAN_MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [IRAN_MAP_BOUNDS.south - 0.35, IRAN_MAP_BOUNDS.west - 0.35],
  [IRAN_MAP_BOUNDS.north + 0.35, IRAN_MAP_BOUNDS.east + 0.35],
];
