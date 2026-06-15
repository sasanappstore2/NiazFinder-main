/**
 * Build unified location viewport index (provinces + cities) and per-city neighborhood chunks.
 * Run: npm run geo:build-viewports
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  loadCityCatalogFile,
  resolveCatalogCityIdCandidates,
  type CatalogNeighborhood,
} from '../../src/lib/neighborhoods/catalog';
import { computeCityGeoFromCatalogNeighborhoods } from '../../src/lib/map/city-geo-from-catalog';
import { centroidFromBbox } from '../../src/lib/neighborhoods/geo-geometry';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';
import { loadAdminCities } from '../neighborhoods/lib';
import { cityBboxFromConfig, polygonFromCatalogNeighborhood } from '../neighborhoods/geo-lib';
import { GEO_DIR, ROOT, readJson, writeJson } from './shared';
import type {
  CityViewportChunk,
  CityViewportIndexEntry,
  CompactBbox,
  CompactCenterZoom,
  CompactNeighborhoodViewport,
  LocationViewportsIndex,
  ProvinceViewportIndexEntry,
} from '../../src/lib/map/location-viewport-types';
import { businessBboxToCompact, zoomFromBboxSpan } from '../../src/lib/map/location-viewport-types';

const VIEWPORTS_DIR = path.join(GEO_DIR, 'viewports', 'cities');
const INDEX_PATH = path.join(GEO_DIR, 'iran-location-viewports-index.json');

type CityMapEntry = {
  cityId: string;
  slug: string;
  provinceId: string;
  lat: number;
  lng: number;
  mapZoom: number;
  bboxDelta: { lat: number; lng: number };
  pinBboxDelta?: { lat: number; lng: number };
};

type ProvinceMetaRow = {
  id: string;
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
};

function provinceZoom(bounds: { south: number; north: number; west: number; east: number }): number {
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  const span = Math.max(latSpan, lngSpan);
  if (span > 8) return 5.5;
  if (span > 5) return 6;
  if (span > 3) return 6.5;
  if (span > 1.5) return 7;
  return 7.5;
}

function cityBoundsFromConfig(entry: CityMapEntry): { south: number; north: number; west: number; east: number } {
  const delta = entry.pinBboxDelta ?? entry.bboxDelta;
  return {
    south: entry.lat - delta.lat,
    north: entry.lat + delta.lat,
    west: entry.lng - delta.lng,
    east: entry.lng + delta.lng,
  };
}

function bboxFromPolygonCoords(coords: number[][]): CompactBbox {
  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;
  for (const [lng, lat] of coords) {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
  }
  return [west, south, east, north];
}

function resolveNeighborhoodViewport(
  n: CatalogNeighborhood,
  index: number,
  count: number,
  cityBbox: { south: number; north: number; west: number; east: number }
): CompactNeighborhoodViewport {
  if (n.bbox) {
    const b: CompactBbox = [n.bbox.west, n.bbox.south, n.bbox.east, n.bbox.north];
    const c = n.centroid ?? centroidFromBbox(n.bbox);
    return { c: [c.lat, c.lng], b };
  }

  if (n.centroid) {
    const { geometry } = polygonFromCatalogNeighborhood(n, {
      cityBbox,
      index,
      count,
      seed: `${n.id}:${index}`,
    });
    const ring = geometry.coordinates[0] ?? [];
    const b = bboxFromPolygonCoords(ring);
    return { c: [n.centroid.lat, n.centroid.lng], b };
  }

  const { geometry } = polygonFromCatalogNeighborhood(n, {
    cityBbox,
    index,
    count,
    seed: `${n.id}:${index}`,
  });
  const ring = geometry.coordinates[0] ?? [];
  const b = bboxFromPolygonCoords(ring);
  const center = centroidFromBbox({ west: b[0], south: b[1], east: b[2], north: b[3] });
  return { c: [center.lat, center.lng], b };
}

async function resolveCatalogCityIdsForAdmin(adminCityId: string): Promise<string[]> {
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

  return [...ids];
}

async function resolveMergedCatalog(adminCityId: string): Promise<{
  catalogCityId: string;
  neighborhoods: CatalogNeighborhood[];
} | null> {
  const catalogIds = await resolveCatalogCityIdsForAdmin(adminCityId);
  const byId = new Map<string, CatalogNeighborhood>();
  let primaryCatalogId = catalogIds[0] ?? adminCityId;

  for (const catalogCityId of catalogIds) {
    const catalog = await loadCityCatalogFile(catalogCityId);
    if (!catalog?.neighborhoods?.length) continue;
    if (catalog.neighborhoods.length >= (byId.size || 0)) primaryCatalogId = catalogCityId;
    for (const n of catalog.neighborhoods) {
      if (!byId.has(n.id)) byId.set(n.id, n);
    }
  }

  const neighborhoods = [...byId.values()];
  if (!neighborhoods.length) return null;
  return { catalogCityId: primaryCatalogId, neighborhoods };
}

function lookupCityMapEntry(
  cities: Record<string, CityMapEntry>,
  adminCityId: string
): CityMapEntry | null {
  const slug = locationCityIdToSlug(adminCityId);
  return cities[slug] ?? cities[adminCityId] ?? cities[`${slug}-city`] ?? null;
}

async function main() {
  const cityFilter = process.argv.find((a) => a.startsWith('--city='))?.slice('--city='.length);
  const provincesMeta = readJson<{ provinces: ProvinceMetaRow[] }>(
    path.join(GEO_DIR, 'iran-provinces-meta.json')
  );
  const cityMapConfig = readJson<{ cities: Record<string, CityMapEntry> }>(
    path.join(GEO_DIR, 'iran-cities-map-config.json')
  );
  const allAdminCities = await loadAdminCities();
  const adminCities = cityFilter
    ? allAdminCities.filter((c) => c.id === cityFilter)
    : allAdminCities;
  if (cityFilter && adminCities.length === 0) {
    throw new Error(`Unknown admin city: ${cityFilter}`);
  }
  const citiesById = cityMapConfig.cities ?? {};

  const provinces: Record<string, ProvinceViewportIndexEntry> = {};
  for (const p of provincesMeta.provinces ?? []) {
    const bounds = {
      west: p.bbox.minLon,
      south: p.bbox.minLat,
      east: p.bbox.maxLon,
      north: p.bbox.maxLat,
    };
    const c: CompactCenterZoom = [
      (bounds.south + bounds.north) / 2,
      (bounds.west + bounds.east) / 2,
      provinceZoom(bounds),
    ];
    provinces[p.id] = { c, b: businessBboxToCompact(bounds) };
  }

  const existingIndex = fs.existsSync(INDEX_PATH)
    ? readJson<LocationViewportsIndex>(INDEX_PATH)
    : null;
  const cities: Record<string, CityViewportIndexEntry> = {
    ...(existingIndex?.cities ?? {}),
  };
  let chunkCount = 0;
  let neighborhoodCount = 0;

  fs.mkdirSync(VIEWPORTS_DIR, { recursive: true });

  for (const city of adminCities) {
    const mapEntry = lookupCityMapEntry(citiesById, city.id);
    const slug = locationCityIdToSlug(city.id);

    const catalog = await resolveMergedCatalog(city.id);
    const catalogGeo = catalog?.neighborhoods.length
      ? computeCityGeoFromCatalogNeighborhoods(catalog.neighborhoods)
      : null;

    let cityBounds = catalogGeo?.bounds ?? (mapEntry ? cityBoundsFromConfig(mapEntry) : cityBboxFromConfig(slug));
    if (!cityBounds) {
      cityBounds = { south: 25, north: 40, west: 44, east: 64 };
    }

    const centerLat =
      catalogGeo?.lat ?? mapEntry?.lat ?? (cityBounds.south + cityBounds.north) / 2;
    const centerLng =
      catalogGeo?.lng ?? mapEntry?.lng ?? (cityBounds.west + cityBounds.east) / 2;
    const cityZoom = mapEntry?.mapZoom ?? zoomFromBboxSpan(cityBounds);
    const catalogCityId = catalog?.catalogCityId ?? slug;

    const n: Record<string, CompactNeighborhoodViewport> = {};
    if (catalog?.neighborhoods.length) {
      const count = catalog.neighborhoods.length;
      catalog.neighborhoods.forEach((neighborhood, index) => {
        n[neighborhood.id] = resolveNeighborhoodViewport(neighborhood, index, count, cityBounds!);
        neighborhoodCount += 1;
      });
    }

    const chunk: CityViewportChunk = {
      cityId: city.id,
      c: [centerLat, centerLng, cityZoom],
      b: businessBboxToCompact(cityBounds),
      n,
    };

    writeJson(path.join(VIEWPORTS_DIR, `${city.id}.json`), chunk);
    chunkCount += 1;

    cities[city.id] = {
      cityId: city.id,
      provinceId: city.provinceId,
      catalogCityId,
      c: chunk.c,
      b: chunk.b,
    };
    cities[slug] = cities[city.id]!;
  }

  const index: LocationViewportsIndex = {
    generatedAt: new Date().toISOString(),
    provinces: existingIndex?.provinces ?? provinces,
    cities,
  };
  writeJson(INDEX_PATH, index);

  console.log(`Viewport index → ${INDEX_PATH}`);
  console.log(`City chunks → ${VIEWPORTS_DIR} (${cityFilter ? 1 : chunkCount} updated)`);
  console.log(`Neighborhoods indexed this run: ${neighborhoodCount}`);
  console.log(`Provinces: ${Object.keys(index.provinces).length}, Cities in index: ${Object.keys(cities).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
