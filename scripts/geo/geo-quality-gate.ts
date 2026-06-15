/**
 * Geo quality gate — accuracy checks beyond validate-coverage.
 * Run: npm run geo:quality-check
 *      npm run geo:quality-check -- --province=tehran
 *      npm run geo:quality-check -- --city=mashhad
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Feature, Polygon } from 'geojson';
import {
  loadCityCatalogFile,
  resolveCatalogCityIdCandidates,
  type CatalogNeighborhood,
} from '../../src/lib/neighborhoods/catalog';
import { loadCityGeoFile } from '../../src/lib/neighborhoods/geo';
import { centroidFromBbox, bboxFromPolygonFeature } from '../../src/lib/neighborhoods/geo-geometry';
import type { NeighborhoodGeoSource } from '../../src/lib/neighborhoods/catalog-types';
import { computeCityGeoFromCatalogNeighborhoods } from '../../src/lib/map/city-geo-from-catalog';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';
import { loadAdminCities, adminSlugForCityId, type AdminCityRef } from '../neighborhoods/lib';
import { cityBboxFromConfig } from '../neighborhoods/geo-lib';
import { GEO_DIR, readJson, ROOT } from './shared';
import { parseGeoArgs } from './geo-args';
import { getTierThresholds, resolveCityTier, tierQualityRequirement } from './tier-config';

const VIEWPORT_CHUNKS_DIR = path.join(GEO_DIR, 'viewports', 'cities');
const PROVINCE_META_PATH = path.join(GEO_DIR, 'iran-provinces-meta.json');
const DIVAR_MAP_PATH = path.join(ROOT, 'src/data/neighborhoods/divar-city-map.json');

const IRAN_LAT = { min: 25, max: 40 } as const;
const IRAN_LNG = { min: 44, max: 64 } as const;
const VALID_SOURCES = new Set<NeighborhoodGeoSource>(['osm', 'divar', 'synthetic', 'manual']);

export interface GeoQualityIssue {
  level: 'error' | 'warn';
  cityId: string;
  neighborhoodId?: string;
  code: string;
  message: string;
}

export interface CityGeoQualityReport {
  cityId: string;
  cityName: string;
  provinceId: string;
  tier: 'A' | 'B' | 'C';
  neighborhoodCount: number;
  shares: { divar: number; osm: number; synthetic: number; manual: number; total: number };
  tierOk: boolean;
  issues: GeoQualityIssue[];
  pass: boolean;
}

export interface ProvinceGeoQualityReport {
  provinceId: string;
  provinceName: string;
  generatedAt: string;
  cities: CityGeoQualityReport[];
  errors: number;
  warnings: number;
  pass: boolean;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function pointInBbox(
  lat: number,
  lng: number,
  bbox: { south: number; north: number; west: number; east: number },
  padding = 0.02
): boolean {
  return (
    lat >= bbox.south - padding &&
    lat <= bbox.north + padding &&
    lng >= bbox.west - padding &&
    lng <= bbox.east + padding
  );
}

function polygonArea(ring: number[][]): number {
  if (ring.length < 4) return 0;
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    sum += x1! * y2! - x2! * y1!;
  }
  return Math.abs(sum) / 2;
}

function loadProvinceBbox(provinceId: string): {
  south: number;
  north: number;
  west: number;
  east: number;
} | null {
  try {
    const meta = readJson<{
      provinces: Array<{
        id: string;
        bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
      }>;
    }>(PROVINCE_META_PATH);
    const row = meta.provinces.find((p) => p.id === provinceId);
    if (!row) return null;
    return {
      south: row.bbox.minLat,
      north: row.bbox.maxLat,
      west: row.bbox.minLon,
      east: row.bbox.maxLon,
    };
  } catch {
    return null;
  }
}

function loadDivarMappedSet(): Set<string> {
  try {
    const map = readJson<Record<string, unknown>>(DIVAR_MAP_PATH);
    return new Set(Object.keys(map));
  } catch {
    return new Set();
  }
}

async function resolveCatalogForAdminCity(cityId: string): Promise<{
  catalogCityIds: string[];
  neighborhoods: CatalogNeighborhood[];
} | null> {
  const ids = new Set(resolveCatalogCityIdCandidates(cityId));
  try {
    const divarMap = readJson<Record<string, { divarSlug?: string }>>(DIVAR_MAP_PATH);
    const slug = locationCityIdToSlug(cityId);
    for (const [catalogCityId, meta] of Object.entries(divarMap)) {
      if (
        meta.divarSlug === slug ||
        catalogCityId === cityId ||
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
  const catalogCityIds: string[] = [];
  for (const candidate of ids) {
    const file = await loadCityCatalogFile(candidate);
    if (!file?.neighborhoods?.length) continue;
    catalogCityIds.push(candidate);
    for (const n of file.neighborhoods) {
      if (!byId.has(n.id)) byId.set(n.id, n);
    }
  }
  const neighborhoods = [...byId.values()];
  if (!neighborhoods.length) return null;
  return { catalogCityIds, neighborhoods };
}

async function loadMergedGeoFeatures(
  catalogCityIds: string[]
): Promise<Array<Feature<Polygon>>> {
  const seen = new Set<string>();
  const features: Array<Feature<Polygon>> = [];
  for (const catalogCityId of catalogCityIds) {
    const geo = await loadCityGeoFile(catalogCityId);
    for (const f of (geo?.features ?? []) as Array<Feature<Polygon>>) {
      const id = String(f.properties?.id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      features.push(f);
    }
  }
  return features;
}

function effectiveCityBbox(
  neighborhoods: CatalogNeighborhood[],
  mapBbox: ReturnType<typeof cityBboxFromConfig>
): { south: number; north: number; west: number; east: number } | null {
  const fromCatalog = computeCityGeoFromCatalogNeighborhoods(neighborhoods);
  if (!fromCatalog && !mapBbox) return null;
  if (!fromCatalog) return mapBbox;
  if (!mapBbox) return fromCatalog.bounds;
  return {
    south: Math.min(fromCatalog.bounds.south, mapBbox.south),
    north: Math.max(fromCatalog.bounds.north, mapBbox.north),
    west: Math.min(fromCatalog.bounds.west, mapBbox.west),
    east: Math.max(fromCatalog.bounds.east, mapBbox.east),
  };
}

function countShares(
  neighborhoods: CatalogNeighborhood[],
  features: Array<Feature<Polygon>>
): CityGeoQualityReport['shares'] {
  const shares = { divar: 0, osm: 0, synthetic: 0, manual: 0, total: neighborhoods.length };
  const featureById = new Map(features.map((f) => [f.properties?.id ?? '', f.properties?.geoSource]));
  for (const n of neighborhoods) {
    const src =
      (n.geoSource as NeighborhoodGeoSource | undefined) ??
      (featureById.get(n.id) as NeighborhoodGeoSource | undefined) ??
      'synthetic';
    if (src === 'divar') shares.divar += 1;
    else if (src === 'osm') shares.osm += 1;
    else if (src === 'manual') shares.manual += 1;
    else shares.synthetic += 1;
  }
  return shares;
}

export async function checkCityGeoQuality(
  city: AdminCityRef,
  divarMapped: Set<string>
): Promise<CityGeoQualityReport> {
  const issues: GeoQualityIssue[] = [];
  const slug = adminSlugForCityId(city.id);
  const cityBbox = cityBboxFromConfig(slug);
  const provinceBbox = loadProvinceBbox(city.provinceId);
  const tier = resolveCityTier(city.id, divarMapped.has(city.id));

  const resolved = await resolveCatalogForAdminCity(city.id);
  if (!resolved) {
    issues.push({
      level: 'error',
      cityId: city.id,
      code: 'missing_catalog',
      message: 'no neighborhood catalog',
    });
    return {
      cityId: city.id,
      cityName: city.name,
      provinceId: city.provinceId,
      tier,
      neighborhoodCount: 0,
      shares: { divar: 0, osm: 0, synthetic: 0, manual: 0, total: 0 },
      tierOk: false,
      issues,
      pass: false,
    };
  }

  const { catalogCityIds, neighborhoods } = resolved;
  const features = await loadMergedGeoFeatures(catalogCityIds);
  const cityBounds = effectiveCityBbox(neighborhoods, cityBbox);
  const featureById = new Map(features.map((f) => [String(f.properties?.id ?? ''), f]));
  const shares = countShares(neighborhoods, features);
  const tierReq = tierQualityRequirement(tier, shares);

  if (!cityBbox) {
    issues.push({
      level: 'error',
      cityId: city.id,
      code: 'missing_city_bbox',
      message: `no map config for slug ${slug}`,
    });
  }

  const chunkPath = path.join(VIEWPORT_CHUNKS_DIR, `${city.id}.json`);
  if (!fs.existsSync(chunkPath)) {
    issues.push({
      level: 'error',
      cityId: city.id,
      code: 'missing_viewport_chunk',
      message: 'viewport chunk missing',
    });
  }

  for (const n of neighborhoods) {
    const feature = featureById.get(n.id);
    if (!feature) {
      issues.push({
        level: 'error',
        cityId: city.id,
        neighborhoodId: n.id,
        code: 'missing_geo_feature',
        message: 'no polygon in geo file',
      });
      continue;
    }

    const src = n.geoSource ?? (feature.properties?.geoSource as NeighborhoodGeoSource | undefined);
    if (!src || !VALID_SOURCES.has(src)) {
      issues.push({
        level: 'error',
        cityId: city.id,
        neighborhoodId: n.id,
        code: 'missing_geo_source',
        message: 'geoSource not set',
      });
    }

    const centroid =
      n.centroid ??
      (n.bbox ? centroidFromBbox(n.bbox) : centroidFromBbox(bboxFromPolygonFeature(feature)));

    if (
      centroid.lat < IRAN_LAT.min ||
      centroid.lat > IRAN_LAT.max ||
      centroid.lng < IRAN_LNG.min ||
      centroid.lng > IRAN_LNG.max
    ) {
      issues.push({
        level: 'error',
        cityId: city.id,
        neighborhoodId: n.id,
        code: 'centroid_out_of_iran',
        message: `centroid ${centroid.lat},${centroid.lng} outside Iran bounds`,
      });
    }

    if (cityBounds && !pointInBbox(centroid.lat, centroid.lng, cityBounds, 0.02)) {
      issues.push({
        level: 'warn',
        cityId: city.id,
        neighborhoodId: n.id,
        code: 'centroid_outside_city',
        message: 'centroid outside expanded city bbox',
      });
    }

    if (provinceBbox && !pointInBbox(centroid.lat, centroid.lng, provinceBbox, 0.05)) {
      issues.push({
        level: 'warn',
        cityId: city.id,
        neighborhoodId: n.id,
        code: 'centroid_outside_province',
        message: 'centroid outside province bbox',
      });
    }

    if (!n.centroid && !n.bbox) {
      issues.push({
        level: 'error',
        cityId: city.id,
        neighborhoodId: n.id,
        code: 'missing_centroid_bbox',
        message: 'catalog missing centroid and bbox',
      });
    }

    const ring = feature.geometry.coordinates[0] ?? [];
    if (ring.length < 4) {
      issues.push({
        level: 'error',
        cityId: city.id,
        neighborhoodId: n.id,
        code: 'invalid_polygon',
        message: 'polygon has fewer than 4 points',
      });
    } else {
      const first = ring[0]!;
      const last = ring[ring.length - 1]!;
      if (first[0] !== last[0] || first[1] !== last[1]) {
        issues.push({
          level: 'error',
          cityId: city.id,
          neighborhoodId: n.id,
          code: 'open_polygon',
          message: 'polygon ring not closed',
        });
      }
      if (polygonArea(ring) <= 0) {
        issues.push({
          level: 'error',
          cityId: city.id,
          neighborhoodId: n.id,
          code: 'zero_area_polygon',
          message: 'polygon area is zero',
        });
      }
    }

    if (n.centroid && feature) {
      const polyCenter = centroidFromBbox(bboxFromPolygonFeature(feature));
      const drift = haversineMeters(n.centroid.lat, n.centroid.lng, polyCenter.lat, polyCenter.lng);
      const { centroidDriftWarnMeters } = getTierThresholds();
      if (drift > centroidDriftWarnMeters) {
        issues.push({
          level: 'warn',
          cityId: city.id,
          neighborhoodId: n.id,
          code: 'centroid_drift',
          message: `catalog centroid ${Math.round(drift)}m from polygon center`,
        });
      }
    }
  }

  if (!tierReq.ok) {
    issues.push({
      level: tier === 'A' ? 'error' : 'warn',
      cityId: city.id,
      code: 'tier_quality',
      message: tierReq.message ?? 'tier quality not met',
    });
  }

  const errors = issues.filter((i) => i.level === 'error').length;
  return {
    cityId: city.id,
    cityName: city.name,
    provinceId: city.provinceId,
    tier,
    neighborhoodCount: neighborhoods.length,
    shares,
    tierOk: tierReq.ok,
    issues,
    pass: errors === 0,
  };
}

export async function checkProvinceGeoQuality(provinceId: string): Promise<ProvinceGeoQualityReport> {
  const adminCities = await loadAdminCities();
  const divarMapped = loadDivarMappedSet();
  const citiesInProvince = adminCities.filter((c) => c.provinceId === provinceId);
  const provinceName = citiesInProvince[0]?.provinceName ?? provinceId;

  const cityReports: CityGeoQualityReport[] = [];
  for (const city of citiesInProvince) {
    cityReports.push(await checkCityGeoQuality(city, divarMapped));
  }

  const errors = cityReports.reduce(
    (n, c) => n + c.issues.filter((i) => i.level === 'error').length,
    0
  );
  const warnings = cityReports.reduce(
    (n, c) => n + c.issues.filter((i) => i.level === 'warn').length,
    0
  );

  return {
    provinceId,
    provinceName,
    generatedAt: new Date().toISOString(),
    cities: cityReports,
    errors,
    warnings,
    pass: cityReports.every((c) => c.pass),
  };
}

export async function checkNationalGeoQuality(opts?: {
  provinceId?: string;
  cityId?: string;
}): Promise<ProvinceGeoQualityReport[]> {
  const adminCities = await loadAdminCities();
  const divarMapped = loadDivarMappedSet();

  if (opts?.cityId) {
    const city = adminCities.find((c) => c.id === opts.cityId);
    if (!city) throw new Error(`Unknown city: ${opts.cityId}`);
    const report = await checkCityGeoQuality(city, divarMapped);
    return [
      {
        provinceId: city.provinceId,
        provinceName: city.provinceName,
        generatedAt: new Date().toISOString(),
        cities: [report],
        errors: report.issues.filter((i) => i.level === 'error').length,
        warnings: report.issues.filter((i) => i.level === 'warn').length,
        pass: report.pass,
      },
    ];
  }

  const provinceIds = opts?.provinceId
    ? [opts.provinceId]
    : [...new Set(adminCities.map((c) => c.provinceId))];

  const reports: ProvinceGeoQualityReport[] = [];
  for (const pid of provinceIds) {
    reports.push(await checkProvinceGeoQuality(pid));
  }
  return reports;
}

async function main(): Promise<void> {
  const args = parseGeoArgs(process.argv.slice(2));
  const reports = await checkNationalGeoQuality({
    provinceId: args.province,
    cityId: args.city,
  });

  const gatesDir = path.join(ROOT, 'reports/geo-gates');
  fs.mkdirSync(gatesDir, { recursive: true });

  let totalErrors = 0;
  for (const report of reports) {
    const outPath = path.join(gatesDir, `${report.provinceId}.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(
      `${report.provinceName} (${report.provinceId}): ${report.pass ? 'PASS' : 'FAIL'} — ${report.errors} errors, ${report.warnings} warnings → ${outPath}`
    );
    if (!report.pass) {
      for (const city of report.cities) {
        if (!city.pass) {
          for (const issue of city.issues.filter((i) => i.level === 'error')) {
            console.error(`  [${city.cityId}] ${issue.code}: ${issue.message}`);
          }
        }
      }
    }
    totalErrors += report.errors;
  }

  if (totalErrors > 0) process.exit(1);
  console.log('\nGeo quality check passed.');
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(
    process.argv[1]?.endsWith('geo-quality-gate.ts') ||
      process.argv[1]?.includes('/geo-quality-gate.ts')
  );

if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
