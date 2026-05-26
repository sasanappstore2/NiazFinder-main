/**
 * Approximate coordinates for nearest-city detection (Haversine).
 * Slugs align with URL / city-slugs registry.
 */

import type { City } from '@/lib/location-system';
import { cityFromSlug } from '@/lib/search/city-slugs';

export interface CityCoordinate {
  slug: string;
  lat: number;
  lng: number;
}

/** Major Iranian cities + suburbs used for geo matching */
export const CITY_COORDINATES: readonly CityCoordinate[] = [
  { slug: 'tehran', lat: 35.6892, lng: 51.389 },
  { slug: 'karaj', lat: 35.84, lng: 50.9391 },
  { slug: 'isfahan', lat: 32.6539, lng: 51.666 },
  { slug: 'shiraz', lat: 29.5918, lng: 52.5837 },
  { slug: 'tabriz', lat: 38.08, lng: 46.2919 },
  { slug: 'urmia', lat: 37.5553, lng: 45.0725 },
  { slug: 'mashhad', lat: 36.2605, lng: 59.6168 },
  { slug: 'ahvaz', lat: 31.3183, lng: 48.6706 },
  { slug: 'qom', lat: 34.6416, lng: 50.8746 },
  { slug: 'rasht', lat: 37.2808, lng: 49.5832 },
  { slug: 'sari', lat: 36.5633, lng: 53.06 },
  { slug: 'kerman', lat: 30.2839, lng: 57.0834 },
  { slug: 'kermanshah', lat: 34.3142, lng: 47.065 },
  { slug: 'zahedan', lat: 29.4963, lng: 60.8629 },
  { slug: 'bandar-abbas', lat: 27.1832, lng: 56.2666 },
  { slug: 'sanandaj', lat: 35.3219, lng: 46.9862 },
  { slug: 'qazvin', lat: 36.2688, lng: 50.0041 },
  { slug: 'zanjan', lat: 36.6736, lng: 48.4787 },
  { slug: 'gorgan', lat: 36.8416, lng: 54.4436 },
  { slug: 'ardabil', lat: 38.2498, lng: 48.2933 },
  { slug: 'hamadan', lat: 34.7992, lng: 48.5146 },
  { slug: 'yazd', lat: 31.8974, lng: 54.3569 },
  { slug: 'arak', lat: 34.0917, lng: 49.6892 },
  { slug: 'bushehr', lat: 28.9234, lng: 50.8203 },
  { slug: 'bojnourd', lat: 37.4747, lng: 57.329 },
  { slug: 'kashan', lat: 33.985, lng: 51.41 },
  { slug: 'birjand', lat: 32.8663, lng: 59.2211 },
  { slug: 'ilam', lat: 33.6374, lng: 46.4227 },
  { slug: 'semnan', lat: 35.5769, lng: 53.392 },
  { slug: 'shahrekord', lat: 32.3256, lng: 50.8644 },
] as const;

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distance in km between two WGS84 points */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Nearest registry slug for given coordinates */
export function nearestCitySlug(lat: number, lng: number): string {
  let best = CITY_COORDINATES[0];
  let bestDist = Infinity;

  for (const c of CITY_COORDINATES) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }

  return best.slug;
}

/** Resolve coordinates to a location-system City (for selector + cookies) */
export function nearestLocationCity(lat: number, lng: number): City | null {
  const slug = nearestCitySlug(lat, lng);
  return cityFromSlug(slug);
}
