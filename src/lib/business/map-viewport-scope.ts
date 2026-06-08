import { resolveBusinessMapCityBounds } from '@/lib/business/map-city-bounds';
import { resolveBusinessMapCenter } from '@/lib/business/map-default-center';
import {
  resolveBusinessMapProvinceBounds,
  resolveBusinessMapProvinceCenter,
} from '@/lib/business/map-province-bounds';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import { resolveProvinceIdForCitySlug } from '@/lib/map/iran/city-admin-boundaries';
import { isKnownCitySlug } from '@/lib/search/city-slugs';
import { isKnownProvinceSlug, provinceSlugToId } from '@/lib/search/province-slugs';

export type MapViewportScopeKind = 'national' | 'province' | 'city';

export type MapViewportScope = {
  kind: MapViewportScopeKind;
  bounds: BusinessMapBbox | null;
  center: { lat: number; lng: number; zoom: number };
  provinceIds: string[];
  citySlugs: string[];
};

function normalizeLocationSlugs(citySlugs: string[], provinceSlugs: string[]) {
  const cities: string[] = [];
  const provinces = [...provinceSlugs];
  for (const slug of citySlugs) {
    const s = slug.toLowerCase();
    if (isKnownProvinceSlug(s) && !isKnownCitySlug(s)) {
      if (!provinces.includes(s)) provinces.push(s);
    } else {
      cities.push(s);
    }
  }
  return { citySlugs: cities, provinceSlugs: provinces };
}

export function resolveMapViewportScope(
  citySlugs: string[],
  provinceSlugs: string[] = []
): MapViewportScope {
  const normalized = normalizeLocationSlugs(citySlugs, provinceSlugs);
  citySlugs = normalized.citySlugs;
  provinceSlugs = normalized.provinceSlugs;

  const cityBounds = resolveBusinessMapCityBounds(citySlugs);
  let provinceIds = provinceSlugs.map((slug) => provinceSlugToId(slug));

  if (citySlugs.length > 0 && provinceIds.length === 0) {
    provinceIds = [
      ...new Set(
        citySlugs
          .map((slug) => resolveProvinceIdForCitySlug(slug))
          .filter((id): id is string => Boolean(id))
      ),
    ];
  }

  if (cityBounds) {
    return {
      kind: 'city',
      bounds: cityBounds,
      center: resolveBusinessMapCenter(citySlugs),
      provinceIds,
      citySlugs,
    };
  }

  const provinceBounds = resolveBusinessMapProvinceBounds(provinceSlugs);
  if (provinceBounds) {
    return {
      kind: 'province',
      bounds: provinceBounds,
      center: resolveBusinessMapProvinceCenter(provinceSlugs),
      provinceIds,
      citySlugs: [],
    };
  }

  return {
    kind: 'national',
    bounds: null,
    center: resolveBusinessMapCenter([]),
    provinceIds: [],
    citySlugs: [],
  };
}
