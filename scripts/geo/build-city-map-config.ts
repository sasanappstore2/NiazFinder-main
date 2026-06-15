/**
 * Build unified city map config from admin locations + Divar city metadata.
 * - Links each city to an origin hub (شهر مبدا) via Divar `parent` clusters
 * - Derives bbox deltas and map zoom from Divar `radius`
 * - Updates admin-locations.json with `originCityId`
 * - Refreshes iran-cities-centroids.json with Divar coordinates when available
 *
 * Usage: npx tsx scripts/geo/build-city-map-config.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  loadCityCatalogFile,
  resolveCatalogCityIdCandidates,
  type CatalogNeighborhood,
} from '../../src/lib/neighborhoods/catalog';
import { computeCityGeoFromCatalogNeighborhoods } from '../../src/lib/map/city-geo-from-catalog';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';
import { GEO_DIR, ROOT, loadAdminProvinces, readJson, writeJson } from './shared';

type DivarCity = {
  id: number;
  name: string;
  slug: string;
  level: string;
  radius: number;
  parent: number;
  centroid?: { latitude: number; longitude: number };
  default_location?: { latitude: number; longitude: number };
};

type DivarCityMapEntry = {
  divarCityId: number;
  divarSlug: string;
  matchMethod: string;
};

type CityMapEntry = {
  cityId: string;
  slug: string;
  name: string;
  provinceId: string;
  lat: number;
  lng: number;
  radiusM: number;
  /** Viewport / metro zoom bbox (hub-sized). */
  bboxDelta: { lat: number; lng: number };
  /** Per-city boundary bbox from own radius. */
  pinBboxDelta: { lat: number; lng: number };
  originCityId: string;
  originCitySlug: string;
  viewportCitySlug: string;
  mapZoom: number;
  source: 'divar' | 'centroid' | 'catalog' | 'fallback';
};

const MAX_HUB_RADIUS_M = 26_000;

const SLUG_OVERRIDES: Record<string, string> = {
  'tehran-city': 'tehran',
  'isfahan-city': 'isfahan',
  'shiraz-city': 'shiraz',
  'mashhad-city': 'mashhad',
  'tabriz-city': 'tabriz',
  'ahvaz-city': 'ahvaz',
  'qom-city': 'qom',
  'kerman-city': 'kerman',
  'rasht-city': 'rasht',
  'yazd-city': 'yazd',
  'khorasan-razavi-1': 'mashhad',
  'khorasan-razavi-2': 'nishapur',
  nishabur: 'nishapur',
};

function cityIdToSlug(cityId: string): string {
  return SLUG_OVERRIDES[cityId] ?? cityId;
}

function radiusToBBoxDelta(lat: number, radiusM: number, padding = 1.12): { lat: number; lng: number } {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  return {
    lat: (radiusM / metersPerDegLat) * padding,
    lng: (radiusM / Math.max(metersPerDegLng, 1)) * padding,
  };
}

function radiusToMapZoom(radiusM: number): number {
  if (radiusM >= 22_000) return 11;
  if (radiusM >= 17_000) return 11.25;
  if (radiusM >= 12_000) return 11.5;
  if (radiusM >= 8_000) return 12;
  if (radiusM >= 5_000) return 12.5;
  return 13;
}

function divarCoords(city: DivarCity): { lat: number; lng: number } {
  const loc = city.default_location ?? city.centroid;
  return { lat: loc!.latitude, lng: loc!.longitude };
}

function pickHubCity(
  cluster: DivarCity[],
  hubOverrides: Record<string, string>
): DivarCity {
  const parent = cluster[0]?.parent;
  if (parent != null) {
    const overrideSlug = hubOverrides[String(parent)];
    if (overrideSlug) {
      const hit = cluster.find((c) => c.slug === overrideSlug);
      if (hit) return hit;
    }
  }

  const sane = cluster.filter((c) => c.radius > 0 && c.radius <= MAX_HUB_RADIUS_M);
  const place2 = sane.filter((c) => c.level === 'place2');
  const pool = place2.length > 0 ? place2 : sane.length > 0 ? sane : cluster;

  return pool.reduce((best, cur) => {
    if (cur.radius > best.radius) return cur;
    if (cur.radius < best.radius) return best;
    if (cur.level === 'place2' && best.level !== 'place2') return cur;
    if (best.level === 'place2' && cur.level !== 'place2') return best;
    return cur.id < best.id ? cur : best;
  });
}

async function resolveMergedCatalogNeighborhoods(
  adminCityId: string
): Promise<CatalogNeighborhood[]> {
  const slug = locationCityIdToSlug(adminCityId);
  const ids = new Set<string>(resolveCatalogCityIdCandidates(adminCityId));

  try {
    const divarMap = readJson<{ [key: string]: { divarSlug?: string } }>(
      path.join(ROOT, 'src/data/neighborhoods/divar-city-map.json')
    );
    for (const [catalogCityId, meta] of Object.entries(divarMap)) {
      if (
        meta.divarSlug === slug ||
        catalogCityId === adminCityId ||
        catalogCityId === slug ||
        catalogCityId.replace(/^alborz-/, '') === slug
      ) {
        ids.add(catalogCityId);
      }
    }
  } catch {
    /* optional */
  }

  const byId = new Map<string, CatalogNeighborhood>();
  for (const catalogCityId of ids) {
    const catalog = await loadCityCatalogFile(catalogCityId);
    if (!catalog?.neighborhoods?.length) continue;
    for (const n of catalog.neighborhoods) {
      if (!byId.has(n.id)) byId.set(n.id, n);
    }
  }
  return [...byId.values()];
}

async function main() {
  const divarCachePath = path.join(ROOT, 'src/data/neighborhoods/.cache/divar-cities.json');
  if (!fs.existsSync(divarCachePath)) {
    console.error('Missing divar-cities cache. Run: npm run neighborhoods:import');
    process.exit(1);
  }

  const divarData = readJson<{ cities: DivarCity[] }>(divarCachePath);
  const divarCityMap = readJson<Record<string, DivarCityMapEntry>>(
    path.join(ROOT, 'src/data/neighborhoods/divar-city-map.json')
  );
  const hubOverrides = readJson<{ byParent: Record<string, string> }>(
    path.join(GEO_DIR, 'divar-hub-overrides.json')
  ).byParent;
  const provinceOverrides = readJson<{ byCityId: Record<string, string> }>(
    path.join(GEO_DIR, 'city-province-overrides.json')
  ).byCityId;

  const divarById = new Map<number, DivarCity>();
  const clusterByParent = new Map<number, DivarCity[]>();
  for (const city of divarData.cities) {
    divarById.set(city.id, city);
    const list = clusterByParent.get(city.parent) ?? [];
    list.push(city);
    clusterByParent.set(city.parent, list);
  }

  const hubDivarIdByDivarId = new Map<number, number>();
  for (const cluster of clusterByParent.values()) {
    const hub = pickHubCity(cluster, hubOverrides);
    for (const member of cluster) {
      hubDivarIdByDivarId.set(member.id, hub.id);
    }
  }

  const adminIdByDivarId = new Map<number, string>();
  for (const [adminId, entry] of Object.entries(divarCityMap)) {
    const divarCity = divarById.get(entry.divarCityId);
    const existing = adminIdByDivarId.get(entry.divarCityId);
    if (!existing) {
      adminIdByDivarId.set(entry.divarCityId, adminId);
      continue;
    }
    const preferNew =
      (divarCity && cityIdToSlug(adminId) === divarCity.slug) ||
      adminId.length < existing.length;
    if (preferNew) adminIdByDivarId.set(entry.divarCityId, adminId);
  }

  const existingCentroids = readJson<{
    cities: Array<{ cityId: string; provinceId: string; name: string; lat: number; lng: number; source?: string }>;
  }>(path.join(GEO_DIR, 'iran-cities-centroids.json'));
  const centroidById = new Map(existingCentroids.cities.map((c) => [c.cityId, c]));

  const provinces = loadAdminProvinces();
  const citiesBySlug: Record<string, CityMapEntry> = {};
  const originByCityId = new Map<string, string>();
  const updatedCentroids: typeof existingCentroids.cities = [];
  let divarMatched = 0;

  const DEFAULT_RADIUS = 15_000;

  for (const province of provinces) {
    for (const city of province.cities) {
      const slug = cityIdToSlug(city.id);
      const divarEntry = divarCityMap[city.id];
      const divarCity = divarEntry ? divarById.get(divarEntry.divarCityId) : undefined;
      const existing = centroidById.get(city.id);

      let lat = existing?.lat ?? 32.4;
      let lng = existing?.lng ?? 53.6;
      let radiusM = DEFAULT_RADIUS;
      let source: CityMapEntry['source'] = existing ? 'centroid' : 'fallback';
      let originCityId = city.id;

      if (divarCity) {
        const coords = divarCoords(divarCity);
        lat = coords.lat;
        lng = coords.lng;
        radiusM = divarCity.radius > 0 ? divarCity.radius : DEFAULT_RADIUS;
        source = 'divar';
        divarMatched += 1;

        const hubDivarId = hubDivarIdByDivarId.get(divarCity.id) ?? divarCity.id;
        const hubAdminId = adminIdByDivarId.get(hubDivarId);
        if (hubAdminId) {
          originCityId = hubAdminId;
        }
      }

      const catalogNeighborhoods = await resolveMergedCatalogNeighborhoods(city.id);
      const catalogGeo = computeCityGeoFromCatalogNeighborhoods(catalogNeighborhoods);
      let pinBboxDeltaOverride: { lat: number; lng: number } | null = null;
      if (catalogGeo) {
        lat = catalogGeo.lat;
        lng = catalogGeo.lng;
        pinBboxDeltaOverride = catalogGeo.pinBboxDelta;
        if (source === 'divar') source = 'catalog';
        else if (source === 'centroid') source = 'catalog';
      }

      originByCityId.set(city.id, originCityId);
      const originCitySlug = cityIdToSlug(originCityId);
      const viewportCitySlug = originCityId === city.id ? slug : originCitySlug;

      let viewportRadiusM = radiusM;
      let viewportLat = lat;
      let viewportLng = lng;
      if (viewportCitySlug !== slug) {
        const hubEntry = citiesBySlug[viewportCitySlug];
        if (hubEntry) {
          viewportRadiusM = hubEntry.radiusM;
          viewportLat = hubEntry.lat;
          viewportLng = hubEntry.lng;
        } else {
          const hubDivar = divarCityMap[originCityId]
            ? divarById.get(divarCityMap[originCityId]!.divarCityId)
            : undefined;
          if (hubDivar) {
            const hubCoords = divarCoords(hubDivar);
            viewportLat = hubCoords.lat;
            viewportLng = hubCoords.lng;
            viewportRadiusM = hubDivar.radius > 0 ? hubDivar.radius : DEFAULT_RADIUS;
          }
        }
      }

      const bboxDelta = radiusToBBoxDelta(viewportLat, viewportRadiusM);
      const pinBboxDelta = pinBboxDeltaOverride ?? radiusToBBoxDelta(lat, radiusM);
      const mapZoom = radiusToMapZoom(viewportRadiusM);
      const provinceId = provinceOverrides[city.id] ?? province.id;

      const entry: CityMapEntry = {
        cityId: city.id,
        slug,
        name: city.name,
        provinceId,
        lat,
        lng,
        radiusM,
        bboxDelta,
        pinBboxDelta,
        originCityId,
        originCitySlug,
        viewportCitySlug,
        mapZoom,
        source,
      };
      citiesBySlug[slug] = entry;

      updatedCentroids.push({
        cityId: city.id,
        provinceId,
        name: city.name,
        lat,
        lng,
        source: source === 'divar' ? 'divar' : (existing?.source ?? 'offset'),
      });
    }
  }

  // Second pass: satellites inherit hub viewport bbox/zoom (not pin bbox)
  for (const entry of Object.values(citiesBySlug)) {
    if (entry.viewportCitySlug === entry.slug) continue;
    const hub = citiesBySlug[entry.viewportCitySlug];
    if (!hub) continue;
    entry.bboxDelta = { ...hub.bboxDelta };
    entry.mapZoom = hub.mapZoom;
    entry.pinBboxDelta = radiusToBBoxDelta(entry.lat, entry.radiusM);
  }

  writeJson(path.join(GEO_DIR, 'iran-cities-map-config.json'), {
    generatedAt: new Date().toISOString(),
    defaultRadiusM: DEFAULT_RADIUS,
    cities: citiesBySlug,
  });

  writeJson(path.join(GEO_DIR, 'iran-cities-centroids.json'), {
    cities: updatedCentroids,
    generatedAt: new Date().toISOString(),
  });

  const adminPath = path.join(ROOT, 'src/data/admin-locations.json');
  const adminData = readJson<{
    countries: Array<{
      provinces: Array<{
        cities: Array<Record<string, unknown>>;
      }>;
    }>;
    updatedAt: string;
  }>(adminPath);

  for (const province of adminData.countries[0]!.provinces) {
    for (const city of province.cities) {
      const id = city.id as string;
      const origin = originByCityId.get(id);
      if (origin && origin !== id) {
        city.originCityId = origin;
      } else {
        delete city.originCityId;
      }
    }
  }
  adminData.updatedAt = new Date().toISOString();
  writeJson(adminPath, adminData);

  const satelliteCount = Object.values(citiesBySlug).filter((c) => c.viewportCitySlug !== c.slug).length;
  console.log(`Wrote ${Object.keys(citiesBySlug).length} city map configs (${divarMatched} Divar-matched, ${satelliteCount} satellites → origin hub)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
