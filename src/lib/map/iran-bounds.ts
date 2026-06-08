import { IRAN_VIEW_BOUNDS_LNG_LAT } from '@/lib/map/iran/viewport-geo';

/** Minimum zoom — overridden on load by fit-to-Iran for national view. */
export const IRAN_MAP_MIN_ZOOM = 5;

/** Pan limits — exact Iran bbox (lng/lat corners). */
export const IRAN_MAP_MAX_BOUNDS = IRAN_VIEW_BOUNDS_LNG_LAT;
