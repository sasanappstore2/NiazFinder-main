export {
  filterValidMapPins,
  isValidLatLng,
} from '@/lib/business/map-coords';

import { IRAN_MAP_BOUNDS } from '@/lib/business/map-tile-iran';

/** True when coordinates fall inside Iran browse map scope. */
export function isInIranLatLng(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= IRAN_MAP_BOUNDS.south &&
    lat <= IRAN_MAP_BOUNDS.north &&
    lng >= IRAN_MAP_BOUNDS.west &&
    lng <= IRAN_MAP_BOUNDS.east
  );
}
