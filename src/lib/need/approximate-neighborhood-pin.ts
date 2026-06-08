import { resolveBusinessMapCityBounds } from '@/lib/business/map-city-bounds';
import { ALL_LOCATION_CITIES, locationCityIdToSlug } from '@/lib/search/city-slugs';

function hash32(input: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
}

/** Persian city label on ServiceRequest → URL/catalog slug. */
export function persianCityNameToSlug(city: string | null | undefined): string | null {
  if (!city?.trim()) return null;
  const trimmed = city.trim();
  const match = ALL_LOCATION_CITIES.find((c) => c.name === trimmed);
  return match ? locationCityIdToSlug(match.id) : null;
}

/**
 * Stable non-exact pin inside the city's urban bbox for a neighborhood.
 * Same slug → same zone; per-request seed adds small jitter so pins don't stack.
 */
export function resolveApproximateNeighborhoodPin(opts: {
  citySlug: string;
  neighborhoodSlug: string;
  neighborhoodOrder: number;
  neighborhoodCount: number;
  seed: string;
}): { lat: number; lng: number } | null {
  const bbox = resolveBusinessMapCityBounds([opts.citySlug]);
  if (!bbox) return null;

  const count = Math.max(opts.neighborhoodCount, 1);
  const index =
    opts.neighborhoodOrder > 0
      ? opts.neighborhoodOrder - 1
      : hash32(opts.neighborhoodSlug) % count;

  const margin = 0.1;
  const latSpan = (bbox.north - bbox.south) * (1 - 2 * margin);
  const lngSpan = (bbox.east - bbox.west) * (1 - 2 * margin);
  const centerLat = (bbox.north + bbox.south) / 2;
  const centerLng = (bbox.east + bbox.west) / 2;

  const golden = 2.399_963_229_728_653;
  const t = (index + 0.5) / count;
  const angle = index * golden;
  const radius = Math.sqrt(t) * 0.42;

  let lat = centerLat + Math.sin(angle) * radius * latSpan;
  let lng = centerLng + Math.cos(angle) * radius * lngSpan;

  const jitter = hash32(opts.seed);
  lat += (((jitter % 200) - 100) / 100) * latSpan * 0.02;
  lng += ((((jitter >> 8) % 200) - 100) / 100) * lngSpan * 0.02;

  lat = Math.min(bbox.north - margin * (bbox.north - bbox.south), Math.max(bbox.south + margin * (bbox.north - bbox.south), lat));
  lng = Math.min(bbox.east - margin * (bbox.east - bbox.west), Math.max(bbox.west + margin * (bbox.east - bbox.west), lng));

  return { lat, lng };
}

/** Stable city-level pin when only Persian city is known (no lat/lng, no neighborhood). */
export function resolveApproximateCityPin(opts: {
  citySlug: string;
  seed: string;
}): { lat: number; lng: number } | null {
  const bbox = resolveBusinessMapCityBounds([opts.citySlug]);
  if (!bbox) return null;

  const centerLat = (bbox.north + bbox.south) / 2;
  const centerLng = (bbox.east + bbox.west) / 2;
  const latSpan = (bbox.north - bbox.south) * 0.35;
  const lngSpan = (bbox.east - bbox.west) * 0.35;

  const jitter = hash32(opts.seed);
  const angle = (jitter % 360) * (Math.PI / 180);
  const radius = 0.15 + ((jitter >> 10) % 100) / 1000;

  let lat = centerLat + Math.sin(angle) * radius * latSpan;
  let lng = centerLng + Math.cos(angle) * radius * lngSpan;

  const margin = 0.08;
  lat = Math.min(
    bbox.north - margin * (bbox.north - bbox.south),
    Math.max(bbox.south + margin * (bbox.north - bbox.south), lat)
  );
  lng = Math.min(
    bbox.east - margin * (bbox.east - bbox.west),
    Math.max(bbox.west + margin * (bbox.east - bbox.west), lng)
  );

  return { lat, lng };
}
