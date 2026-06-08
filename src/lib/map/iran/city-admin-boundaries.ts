import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import cityCentroids from '@/data/geo/iran-cities-centroids.json';
import provinceLabels from '@/data/geo/iran-provinces.json';
import {
  getCityMapConfigBySlug,
  resolveCityMapPinBboxDelta,
  resolveCityMapPinCenter,
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

function citySlugForCentroid(row: CentroidRow): string {
  return locationCityIdToSlug(row.cityId);
}

function bboxPolygon(
  west: number,
  south: number,
  east: number,
  north: number
): Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

function cityBBoxFeature(row: CentroidRow, selected: boolean): Feature<Polygon> {
  const slug = citySlugForCentroid(row);
  const pin = resolveCityMapPinCenter(slug);
  const cfg = getCityMapConfigBySlug(slug);
  const centerLat = pin?.lat ?? cfg?.lat ?? row.lat;
  const centerLng = pin?.lng ?? cfg?.lng ?? row.lng;
  const delta = resolveCityMapPinBboxDelta(slug);
  return {
    type: 'Feature',
    properties: {
      slug,
      name: row.name,
      provinceId: row.provinceId,
      selected,
    },
    geometry: bboxPolygon(
      centerLng - delta.lng,
      centerLat - delta.lat,
      centerLng + delta.lng,
      centerLat + delta.lat
    ),
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
    return cityBBoxFeature(row, selected);
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
    features.push({
      type: 'Feature',
      properties: {
        name: row.name,
        slug,
        selected: selectedSlugs.has(slug),
      },
      geometry: {
        type: 'Point',
        coordinates: [row.lng, row.lat],
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
