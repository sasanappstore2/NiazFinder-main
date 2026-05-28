import type { City } from '@/lib/location-system';
import { normalizeLookupKey } from '@/intake/normalizer/normalizePersian';
import { loadCityNeighborhoods } from '@/lib/neighborhoods/catalog';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import {
  neighborhoodCandidatesFromAddress,
  type NominatimReverseResult,
} from '@/lib/location/nominatim';
import { nearestLocationCity } from '@/lib/location/city-coordinates';
import { ALL_LOCATION_CITIES, locationCityIdToSlug } from '@/lib/search/city-slugs';

export interface GeoMatchedLocation {
  city: City;
  citySlug: string;
  neighborhood: { id: string; name: string } | null;
  neighborhoodMatchScore: number;
}

const CITY_ADDRESS_KEYS = [
  'city',
  'town',
  'municipality',
  'city_district',
  'state_district',
  'county',
  'village',
] as const;

function findCityFromAddress(address: Record<string, string>): City | null {
  for (const key of CITY_ADDRESS_KEYS) {
    const raw = address[key]?.trim();
    if (!raw) continue;
    const norm = normalizeLookupKey(raw);

    const exact = ALL_LOCATION_CITIES.find((c) => normalizeLookupKey(c.name) === norm);
    if (exact) return exact;

    const partial = ALL_LOCATION_CITIES.find((c) => {
      const cityNorm = normalizeLookupKey(c.name);
      return cityNorm.length >= 3 && (norm.includes(cityNorm) || cityNorm.includes(norm));
    });
    if (partial) return partial;
  }
  return null;
}

function scoreNeighborhoodCandidate(
  candidate: string,
  neighborhood: ManagedNeighborhood
): number {
  const norm = normalizeLookupKey(candidate);
  if (norm.length < 2) return 0;

  const nameKey = normalizeLookupKey(neighborhood.name);
  if (norm === nameKey) return 1;
  if (nameKey.includes(norm) || norm.includes(nameKey)) {
    return 0.88 + Math.min(0.1, norm.length / Math.max(nameKey.length, 1) * 0.1);
  }

  for (const area of neighborhood.areas ?? []) {
    const areaKey = normalizeLookupKey(area);
    if (norm === areaKey) return 0.92;
    if (areaKey.includes(norm) || norm.includes(areaKey)) return 0.8;
  }

  return 0;
}

function matchNeighborhoodInCatalog(
  candidates: string[],
  neighborhoods: ManagedNeighborhood[]
): { id: string; name: string; score: number } | null {
  let best: { id: string; name: string; score: number } | null = null;

  for (const candidate of candidates) {
    for (const n of neighborhoods) {
      const score = scoreNeighborhoodCandidate(candidate, n);
      if (score < 0.72) continue;
      if (!best || score > best.score) {
        best = { id: n.id, name: n.name, score };
      }
    }
  }

  return best;
}

/** Map Nominatim reverse result + coordinates to site city/neighborhood catalog. */
export async function matchGeoToCatalog(
  lat: number,
  lng: number,
  nominatim: NominatimReverseResult
): Promise<GeoMatchedLocation | null> {
  const city = findCityFromAddress(nominatim.address) ?? nearestLocationCity(lat, lng);
  if (!city) return null;

  const citySlug = locationCityIdToSlug(city.id);
  const neighborhoods = await loadCityNeighborhoods(city.id);
  const addressCandidates = neighborhoodCandidatesFromAddress(nominatim.address);

  const displayParts = nominatim.displayName
    .split(/[,،]/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  const allCandidates = [...addressCandidates, ...displayParts];

  const neighborhood = matchNeighborhoodInCatalog(allCandidates, neighborhoods);

  return {
    city,
    citySlug,
    neighborhood: neighborhood ? { id: neighborhood.id, name: neighborhood.name } : null,
    neighborhoodMatchScore: neighborhood?.score ?? 0,
  };
}
