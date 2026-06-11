import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import { resolveLocationMapViewportSync } from '@/lib/map/location-viewport-resolver';
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

  if (citySlugs.length === 1) {
    const viewport = resolveLocationMapViewportSync({
      citySlug: citySlugs[0],
      cityId: citySlugs[0],
      provinceSlug: provinceSlugs[0],
    });
    if (viewport.scope === 'city') {
      return {
        kind: 'city',
        bounds: viewport.bounds,
        center: viewport.center,
        provinceIds,
        citySlugs,
      };
    }
  }

  if (citySlugs.length > 1) {
    const boxes: BusinessMapBbox[] = [];
    const centers: { lat: number; lng: number; zoom: number }[] = [];
    for (const slug of citySlugs) {
      const viewport = resolveLocationMapViewportSync({ citySlug: slug, cityId: slug });
      if (viewport.bounds) boxes.push(viewport.bounds);
      centers.push(viewport.center);
    }
    if (boxes.length > 0) {
      const bounds: BusinessMapBbox = {
        south: Math.min(...boxes.map((b) => b.south)),
        north: Math.max(...boxes.map((b) => b.north)),
        west: Math.min(...boxes.map((b) => b.west)),
        east: Math.max(...boxes.map((b) => b.east)),
      };
      const center = {
        lat: centers.reduce((s, c) => s + c.lat, 0) / centers.length,
        lng: centers.reduce((s, c) => s + c.lng, 0) / centers.length,
        zoom: Math.min(...centers.map((c) => c.zoom)),
      };
      return { kind: 'city', bounds, center, provinceIds, citySlugs };
    }
  }

  if (provinceSlugs.length > 0) {
    const viewport = resolveLocationMapViewportSync({
      provinceSlug: provinceSlugs[0],
      provinceId: provinceIds[0],
    });
    if (viewport.scope === 'province') {
      return {
        kind: 'province',
        bounds: viewport.bounds,
        center: viewport.center,
        provinceIds,
        citySlugs: [],
      };
    }
  }

  const national = resolveLocationMapViewportSync();
  return {
    kind: 'national',
    bounds: national.bounds,
    center: national.center,
    provinceIds: [],
    citySlugs: [],
  };
}
