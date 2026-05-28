const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'NiazFinder/1.0 (https://needfinder.ir; location-intake)';

export interface NominatimReverseResult {
  displayName: string;
  address: Record<string, string>;
}

/** Reverse geocode WGS84 coordinates via OpenStreetMap Nominatim (server-side only). */
export async function reverseGeocodeNominatim(
  lat: number,
  lng: number
): Promise<NominatimReverseResult | null> {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'fa,en');
  url.searchParams.set('zoom', '16');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string>;
    error?: string;
  };

  if (data.error || !data.address) return null;

  const address: Record<string, string> = {};
  for (const [k, v] of Object.entries(data.address)) {
    if (typeof v === 'string' && v.trim()) address[k] = v.trim();
  }

  return {
    displayName: data.display_name?.trim() ?? '',
    address,
  };
}

/** OSM address keys that often carry district / neighborhood names in Iran. */
export const NEIGHBORHOOD_ADDRESS_KEYS = [
  'neighbourhood',
  'suburb',
  'quarter',
  'city_district',
  'district',
  'residential',
  'hamlet',
  'locality',
] as const;

export function neighborhoodCandidatesFromAddress(address: Record<string, string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const key of NEIGHBORHOOD_ADDRESS_KEYS) {
    const value = address[key]?.trim();
    if (!value) continue;
    const norm = value.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(value);
  }

  return out;
}
