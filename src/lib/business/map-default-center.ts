import cityMapConfig from '@/data/geo/iran-cities-map-config.json';
import { CANONICAL_CITIES } from '@/config/locations';
import {
  getCityMapConfigBySlug,
  resolveCityMapPinCenter,
  resolveCityMapViewportCenter,
} from '@/lib/map/city-map-config';

const CITIES_BY_NAME = new Map(
  Object.values(cityMapConfig.cities ?? {}).map((c) => [c.name, c.slug])
);

const IRAN_CENTER = { lat: 32.4279, lng: 53.688, zoom: 5.5 } as const;

/** Default map viewport from browse city scope. */
export function resolveBusinessMapCenter(citySlugs: string[]): {
  lat: number;
  lng: number;
  zoom: number;
} {
  if (citySlugs.length === 1) {
    const slug = citySlugs[0]!;
    const viewport = resolveCityMapViewportCenter(slug);
    if (viewport) return viewport;

    const pin = resolveCityMapPinCenter(slug);
    if (pin) {
      const cfg = getCityMapConfigBySlug(slug);
      return { ...pin, zoom: cfg?.mapZoom ?? 12 };
    }
  }

  if (citySlugs.length > 1) {
    const centers = citySlugs
      .map((slug) => resolveCityMapPinCenter(slug))
      .filter(Boolean) as Array<{ lat: number; lng: number }>;
    if (centers.length > 0) {
      const lat = centers.reduce((s, r) => s + r.lat, 0) / centers.length;
      const lng = centers.reduce((s, r) => s + r.lng, 0) / centers.length;
      return { lat, lng, zoom: 8 };
    }
  }

  return { ...IRAN_CENTER };
}

/** Resolve map center from Persian city label (business profile form). */
export function resolveBusinessMapCenterFromCityLabel(cityLabel: string): {
  lat: number;
  lng: number;
  zoom: number;
} {
  const trimmed = cityLabel.trim();
  if (!trimmed) return { lat: IRAN_CENTER.lat, lng: IRAN_CENTER.lng, zoom: IRAN_CENTER.zoom };

  const canonical = CANONICAL_CITIES.find((c) => c.title === trimmed);
  if (canonical) return resolveBusinessMapCenter([canonical.slug]);

  const slug = CITIES_BY_NAME.get(trimmed);
  if (slug) return resolveBusinessMapCenter([slug]);

  return { lat: IRAN_CENTER.lat, lng: IRAN_CENTER.lng, zoom: IRAN_CENTER.zoom };
}
