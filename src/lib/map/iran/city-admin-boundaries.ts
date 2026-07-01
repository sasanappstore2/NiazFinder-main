import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import cityCentroids from '@/data/geo/iran-cities-centroids.json';
import provinceLabels from '@/data/geo/iran-provinces.json';
import {
  getCityMapConfigBySlug,
  resolveCityMapPinBboxDelta,
  resolveCityScopeRingCenter,
  resolveCityScopeRingRadiusM,
} from '@/lib/map/city-map-config';
import { cityFromSlug, locationCityIdToSlug } from '@/lib/search/city-slugs';

type CentroidRow = {
  cityId: string;
  provinceId: string;
  name: string;
  lat: number;
  lng: number;
};

const CITY_CENTROIDS = (cityCentroids.cities ?? []) as CentroidRow[];

const CIRCLE_STEPS = 64;

function citySlugForCentroid(row: CentroidRow): string {
  return locationCityIdToSlug(row.cityId);
}

/** Label + scope ring share the same anchor (OSM-aligned when configured). */
function resolveCityDisplayCenter(row: CentroidRow): { lat: number; lng: number } {
  const slug = citySlugForCentroid(row);
  const scopeCenter = resolveCityScopeRingCenter(slug);
  const cfg = getCityMapConfigBySlug(slug);
  return {
    lat: scopeCenter?.lat ?? cfg?.lat ?? row.lat,
    lng: scopeCenter?.lng ?? cfg?.lng ?? row.lng,
  };
}

function metersToDegreeLat(meters: number): number {
  return meters / 111_320;
}

function metersToDegreeLng(meters: number, lat: number): number {
  const cos = Math.cos((lat * Math.PI) / 180);
  return meters / (111_320 * Math.max(cos, 0.15));
}

function circlePolygon(
  lng: number,
  lat: number,
  radiusLat: number,
  radiusLng: number
): Polygon {
  const ring: [number, number][] = [];
  for (let i = 0; i <= CIRCLE_STEPS; i++) {
    const angle = (i / CIRCLE_STEPS) * Math.PI * 2;
    ring.push([lng + Math.cos(angle) * radiusLng, lat + Math.sin(angle) * radiusLat]);
  }
  return { type: 'Polygon', coordinates: [ring] };
}

function cityScopeFeature(row: CentroidRow, selected: boolean): Feature<Polygon> {
  const slug = citySlugForCentroid(row);
  const { lat: centerLat, lng: centerLng } = resolveCityDisplayCenter(row);
  const cfg = getCityMapConfigBySlug(slug);

  let radiusLat: number;
  let radiusLng: number;
  const scopeRadiusM = resolveCityScopeRingRadiusM(slug);
  if (scopeRadiusM && scopeRadiusM > 0) {
    radiusLat = metersToDegreeLat(scopeRadiusM);
    radiusLng = metersToDegreeLng(scopeRadiusM, centerLat);
  } else {
    const delta = resolveCityMapPinBboxDelta(slug);
    const r = Math.min(delta.lat, delta.lng);
    radiusLat = r;
    radiusLng = r;
  }

  return {
    type: 'Feature',
    properties: {
      slug,
      name: row.name,
      provinceId: row.provinceId,
      selected,
    },
    geometry: circlePolygon(centerLng, centerLat, radiusLat, radiusLng),
  };
}

export function buildCityBoundariesFeatureCollection(opts: {
  provinceIds: string[];
  citySlugs: string[];
}): FeatureCollection<Polygon> {
  if (opts.citySlugs.length === 0 && opts.provinceIds.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const selectedSlugSet = new Set(opts.citySlugs.map((s) => s.toLowerCase()));
  const provinceIdSet = new Set(opts.provinceIds);

  let rows = CITY_CENTROIDS;

  if (opts.citySlugs.length > 0) {
    rows = rows.filter((row) => selectedSlugSet.has(citySlugForCentroid(row)));
  } else {
    rows = rows.filter((row) => provinceIdSet.has(row.provinceId));
  }

  const features = rows.map((row) => {
    const slug = citySlugForCentroid(row);
    const selected =
      selectedSlugSet.size > 0
        ? selectedSlugSet.has(slug)
        : opts.provinceIds.length > 0;
    return cityScopeFeature(row, selected);
  });

  return { type: 'FeatureCollection', features };
}

export function buildCityLabelsFeatureCollection(opts: {
  provinceIds: string[];
  citySlugs: string[];
}): FeatureCollection<Point, { name: string; slug: string; selected: boolean }> {
  const selectedSlugs = new Set(opts.citySlugs.map((s) => s.toLowerCase()));
  const provinceIdSet = new Set(opts.provinceIds);

  let rows = CITY_CENTROIDS;
  if (provinceIdSet.size > 0) {
    rows = rows.filter((row) => provinceIdSet.has(row.provinceId));
  } else if (selectedSlugs.size > 0) {
    rows = rows.filter((row) => selectedSlugs.has(citySlugForCentroid(row)));
  } else {
    return { type: 'FeatureCollection', features: [] };
  }

  const seen = new Set<string>();
  const features: FeatureCollection<Point, { name: string; slug: string; selected: boolean }>['features'] =
    [];

  for (const row of rows) {
    const slug = citySlugForCentroid(row);
    if (seen.has(slug)) continue;
    seen.add(slug);
    const center = resolveCityDisplayCenter(row);
    features.push({
      type: 'Feature',
      properties: {
        name: row.name,
        slug,
        selected: selectedSlugs.has(slug),
      },
      geometry: {
        type: 'Point',
        coordinates: [center.lng, center.lat],
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

export function resolveProvinceIdForCitySlug(citySlug: string): string | null {
  const city = cityFromSlug(citySlug);
  if (!city) {
    const row = CITY_CENTROIDS.find((c) => citySlugForCentroid(c) === citySlug);
    return row?.provinceId ?? null;
  }
  for (const row of CITY_CENTROIDS) {
    if (row.cityId === city.id) return row.provinceId;
  }
  return null;
}

export const IRAN_PROVINCE_BOUNDARIES_URL = '/geo/iran-provinces-boundaries.geojson';

export const IRAN_PROVINCE_LABELS = provinceLabels as FeatureCollection<
  Point,
  { id: string; name: string; nameEn?: string }
>;
