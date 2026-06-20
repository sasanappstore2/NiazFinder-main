/**
 * Cross-verify neighborhood centroids against live Divar districts + OSM Nominatim.
 *
 * Run:
 *   npm run geo:cross-verify
 *   npm run geo:cross-verify -- --city=mashhad
 *   npm run geo:cross-verify -- --tier=a
 *   npm run geo:cross-verify -- --tier=a --apply-divar
 *   npm run geo:cross-verify -- --tier=a --divar-only
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  loadCityCatalogFile,
  resolveCatalogCityIdCandidates,
  saveCityCatalog,
  type CatalogNeighborhood,
} from '../../src/lib/neighborhoods/catalog';
import {
  NEIGHBORHOODS_ROOT,
  normalizePersianName,
  sleep,
  loadAdminCities,
  adminSlugForCityId,
  type AdminCityRef,
} from '../neighborhoods/lib';
import {
  districtGeoFromDivar,
  fetchDistricts,
  type DivarDistrict,
} from '../neighborhoods/divar-districts';
import {
  neighborhoodCandidatesFromAddress,
  NEIGHBORHOOD_ADDRESS_KEYS,
} from '../../src/lib/location/nominatim';
import { getTierThresholds, loadTierConfig } from './tier-config';
import { ROOT, ensureDir, writeJson } from './shared';

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'NiazFinder-GeoCrossVerify/1.0 (contact@needfinder.ir)';
const NOMINATIM_DELAY_MS = 1100;
const DIVAR_CITY_DELAY_MS = 300;
const REPORTS_DIR = path.join(ROOT, 'reports', 'geo-cross-verify');

const DIVAR_APPLY_DRIFT_M = 150;
const DIVAR_ERROR_DRIFT_M = 1500;
const NOMINATIM_FORWARD_ERROR_M = 2500;
const NOMINATIM_FORWARD_WARN_M = 900;

export interface CrossVerifyIssue {
  level: 'error' | 'warn' | 'info';
  cityId: string;
  neighborhoodId: string;
  neighborhoodName: string;
  code:
    | 'missing_centroid'
    | 'missing_divar_match'
    | 'divar_centroid_drift'
    | 'divar_bbox_drift'
    | 'nominatim_forward_drift'
    | 'nominatim_forward_miss'
    | 'nominatim_reverse_name_mismatch'
    | 'nominatim_reverse_miss';
  message: string;
  catalogCentroid?: { lat: number; lng: number };
  divarCentroid?: { lat: number; lng: number };
  nominatimCentroid?: { lat: number; lng: number };
  driftMetersDivar?: number;
  driftMetersNominatimForward?: number;
  nominatimDisplayName?: string;
  nominatimAddressCandidates?: string[];
}

export interface CityCrossVerifyReport {
  cityId: string;
  cityName: string;
  divarCityId?: number;
  divarDistrictCount: number;
  neighborhoodCount: number;
  divarMatched: number;
  nominatimChecked: number;
  issues: CrossVerifyIssue[];
  fixesApplied: number;
}

export interface CrossVerifyReport {
  generatedAt: string;
  options: CrossVerifyOptions;
  cities: CityCrossVerifyReport[];
  summary: {
    cities: number;
    neighborhoods: number;
    errors: number;
    warnings: number;
    fixesApplied: number;
  };
}

export interface CrossVerifyOptions {
  city?: string;
  tier?: 'a' | 'b' | 'all-divar';
  divarOnly?: boolean;
  applyDivar?: boolean;
  limit?: number;
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

function bboxCenter(bbox: { south: number; north: number; west: number; east: number }): {
  lat: number;
  lng: number;
} {
  return {
    lat: (bbox.south + bbox.north) / 2,
    lng: (bbox.west + bbox.east) / 2,
  };
}

function bboxDriftMeters(
  a: { south: number; north: number; west: number; east: number },
  b: { south: number; north: number; west: number; east: number }
): number {
  const ca = bboxCenter(a);
  const cb = bboxCenter(b);
  return haversineMeters(ca.lat, ca.lng, cb.lat, cb.lng);
}

function compactName(value: string): string {
  return normalizePersianName(value)
    .replace(/^\u0645\u062d\u0644\u0647\s+/u, '')
    .replace(/^\u0645\u0646\u0637\u0642\u0647\s+/u, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function namesMatch(a: string, b: string): boolean {
  const ca = compactName(a);
  const cb = compactName(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  if (ca.includes(cb) || cb.includes(ca)) return true;
  return false;
}

function nameMatchesAnyCandidate(name: string, candidates: string[]): boolean {
  return candidates.some((c) => namesMatch(name, c));
}

function tierIdKeyCandidates(tierId: string): string[] {
  const keys = [tierId, adminSlugForCityId(tierId)];
  if (!tierId.endsWith('-city')) keys.push(`${tierId}-city`);
  if (tierId.endsWith('-city')) keys.push(tierId.replace(/-city$/, ''));
  return [...new Set(keys.filter(Boolean))];
}

function lookupDivarEntry(
  tierId: string,
  divarMap: Record<string, { divarCityId: number; divarSlug?: string }>
): { divarCityId: number; mapKey: string } | null {
  for (const key of tierIdKeyCandidates(tierId)) {
    const entry = divarMap[key];
    if (entry) return { divarCityId: entry.divarCityId, mapKey: key };
  }

  const slugCandidates = new Set(
    tierIdKeyCandidates(tierId).map((k) => k.replace(/-city$/, ''))
  );
  for (const [mapKey, entry] of Object.entries(divarMap)) {
    if (entry.divarSlug && slugCandidates.has(entry.divarSlug)) {
      return { divarCityId: entry.divarCityId, mapKey };
    }
  }

  return null;
}

function lookupAdminForTierId(
  tierId: string,
  byId: Map<string, AdminCityRef>,
  bySlug: Map<string, AdminCityRef>
): AdminCityRef | null {
  for (const key of tierIdKeyCandidates(tierId)) {
    const admin = byId.get(key) ?? bySlug.get(key);
    if (admin) return admin;
  }
  return null;
}

function parseArgs(argv: string[]): CrossVerifyOptions {
  const opts: CrossVerifyOptions = {};
  for (const arg of argv) {
    if (arg === '--divar-only') opts.divarOnly = true;
    if (arg === '--apply-divar') opts.applyDivar = true;
    if (arg.startsWith('--city=')) opts.city = arg.slice('--city='.length).trim();
    if (arg.startsWith('--tier=')) {
      const tier = arg.slice('--tier='.length).trim().toLowerCase();
      if (tier === 'a' || tier === 'b' || tier === 'all-divar') opts.tier = tier;
    }
    if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice('--limit='.length)) || undefined;
  }
  if (!opts.city && !opts.tier) opts.tier = 'a';
  return opts;
}

async function readDivarCityMap(): Promise<
  Record<string, { divarCityId: number; divarSlug: string }>
> {
  const file = path.join(NEIGHBORHOODS_ROOT, 'divar-city-map.json');
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw) as Record<string, { divarCityId: number; divarSlug: string }>;
}

async function loadCatalogForCity(cityId: string): Promise<{
  catalogCityId: string;
  catalog: NonNullable<Awaited<ReturnType<typeof loadCityCatalogFile>>>;
} | null> {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const catalog = await loadCityCatalogFile(candidate);
    if (catalog?.neighborhoods?.length) {
      return { catalogCityId: candidate, catalog };
    }
  }
  return null;
}

function buildDivarDistrictIndex(districts: DivarDistrict[]): Map<string, DivarDistrict> {
  const byName = new Map<string, DivarDistrict>();
  for (const d of districts) {
    byName.set(normalizePersianName(d.name), d);
  }
  return byName;
}

async function nominatimForward(
  neighborhoodName: string,
  cityName: string,
  provinceName: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const queries = [
    `${neighborhoodName}, ${cityName}, ${provinceName}, Iran`,
    `${neighborhoodName}, ${cityName}, Iran`,
    `\u0645\u062d\u0644\u0647 ${neighborhoodName}, ${cityName}, Iran`,
  ];

  for (const q of queries) {
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '3');
    url.searchParams.set('countrycodes', 'ir');
    url.searchParams.set('accept-language', 'fa,en');

    const res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) continue;
    const json = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
      type?: string;
    }>;
    if (!json.length) continue;

    const preferred =
      json.find((h) => {
        const dn = h.display_name ?? '';
        return (
          namesMatch(neighborhoodName, dn) ||
          compactName(dn).includes(compactName(neighborhoodName))
        );
      }) ?? json[0];

    if (!preferred) continue;
    const lat = Number(preferred.lat);
    const lng = Number(preferred.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    return { lat, lng, displayName: preferred.display_name ?? q };
  }

  return null;
}

async function nominatimReverse(
  lat: number,
  lng: number
): Promise<{ displayName: string; candidates: string[] } | null> {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'fa,en');
  url.searchParams.set('zoom', '16');

  const res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });
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

  const candidates = neighborhoodCandidatesFromAddress(address);
  for (const key of NEIGHBORHOOD_ADDRESS_KEYS) {
    const v = address[key]?.trim();
    if (v && !candidates.some((c) => compactName(c) === compactName(v))) {
      candidates.push(v);
    }
  }

  return {
    displayName: data.display_name?.trim() ?? '',
    candidates,
  };
}

function divarDriftLevel(driftM: number): 'error' | 'warn' | 'info' {
  if (driftM >= DIVAR_ERROR_DRIFT_M) return 'error';
  if (driftM >= getTierThresholds().centroidDriftWarnMeters) return 'warn';
  return 'info';
}

function nominatimForwardLevel(driftM: number): 'error' | 'warn' | 'info' {
  if (driftM >= NOMINATIM_FORWARD_ERROR_M) return 'error';
  if (driftM >= NOMINATIM_FORWARD_WARN_M) return 'warn';
  return 'info';
}

async function verifyCity(
  adminCity: AdminCityRef,
  divarCityId: number,
  opts: CrossVerifyOptions
): Promise<CityCrossVerifyReport> {
  const loaded = await loadCatalogForCity(adminCity.id);
  if (!loaded) {
    return {
      cityId: adminCity.id,
      cityName: adminCity.name,
      divarCityId,
      divarDistrictCount: 0,
      neighborhoodCount: 0,
      divarMatched: 0,
      nominatimChecked: 0,
      issues: [
        {
          level: 'warn',
          cityId: adminCity.id,
          neighborhoodId: '',
          neighborhoodName: '',
          code: 'missing_centroid',
          message: 'No catalog file with neighborhoods',
        },
      ],
      fixesApplied: 0,
    };
  }

  const { catalogCityId, catalog } = loaded;
  const districts = await fetchDistricts(divarCityId);
  const divarDistrictCount = districts.length;
  const divarByName = buildDivarDistrictIndex(districts);

  if (divarDistrictCount === 0) {
    console.log(`  ! Divar API returned 0 districts ? skipping Divar compare, Nominatim only`);
  }

  const issues: CrossVerifyIssue[] = [];
  let divarMatched = 0;
  let nominatimChecked = 0;
  let fixesApplied = 0;

  const neighborhoods = opts.limit
    ? catalog.neighborhoods.slice(0, opts.limit)
    : catalog.neighborhoods;

  const pendingFixes: Array<{ hood: CatalogNeighborhood; geo: ReturnType<typeof districtGeoFromDivar> }> =
    [];

  for (const hood of neighborhoods) {
    const divar = divarByName.get(normalizePersianName(hood.name));

    if (!hood.centroid) {
      issues.push({
        level: 'error',
        cityId: catalogCityId,
        neighborhoodId: hood.id,
        neighborhoodName: hood.name,
        code: 'missing_centroid',
        message: 'Catalog neighborhood has no centroid',
      });
    }

    if (!divar) {
      if (divarDistrictCount > 0) {
        issues.push({
          level: 'warn',
          cityId: catalogCityId,
          neighborhoodId: hood.id,
          neighborhoodName: hood.name,
          code: 'missing_divar_match',
          message: 'No matching Divar district by name',
        });
      }
    } else {
      divarMatched += 1;
      const divarGeo = districtGeoFromDivar(divar);

      if (hood.centroid && divarGeo.centroid) {
        const drift = haversineMeters(
          hood.centroid.lat,
          hood.centroid.lng,
          divarGeo.centroid.lat,
          divarGeo.centroid.lng
        );
        const level = divarDriftLevel(drift);
        if (level !== 'info') {
          issues.push({
            level,
            cityId: catalogCityId,
            neighborhoodId: hood.id,
            neighborhoodName: hood.name,
            code: 'divar_centroid_drift',
            message: `Centroid drift ${Math.round(drift)}m vs live Divar`,
            catalogCentroid: hood.centroid,
            divarCentroid: divarGeo.centroid,
            driftMetersDivar: drift,
          });
        }

        if (
          opts.applyDivar &&
          hood.geoSource !== 'manual' &&
          drift >= DIVAR_APPLY_DRIFT_M &&
          divarGeo.centroid
        ) {
          pendingFixes.push({ hood, geo: divarGeo });
        }
      }

      if (hood.bbox && divarGeo.bbox) {
        const bboxDrift = bboxDriftMeters(hood.bbox, divarGeo.bbox);
        if (bboxDrift >= getTierThresholds().centroidDriftWarnMeters) {
          issues.push({
            level: bboxDrift >= DIVAR_ERROR_DRIFT_M ? 'error' : 'warn',
            cityId: catalogCityId,
            neighborhoodId: hood.id,
            neighborhoodName: hood.name,
            code: 'divar_bbox_drift',
            message: `BBox center drift ${Math.round(bboxDrift)}m vs live Divar`,
            driftMetersDivar: bboxDrift,
          });
        }
      }
    }

    if (opts.divarOnly || !hood.centroid) continue;

    nominatimChecked += 1;

    const forward = await nominatimForward(hood.name, adminCity.name, adminCity.provinceName);
    await sleep(NOMINATIM_DELAY_MS);

    if (!forward) {
      issues.push({
        level: 'warn',
        cityId: catalogCityId,
        neighborhoodId: hood.id,
        neighborhoodName: hood.name,
        code: 'nominatim_forward_miss',
        message: 'Nominatim forward geocode returned no hit',
        catalogCentroid: hood.centroid,
      });
    } else {
      const forwardDrift = haversineMeters(
        hood.centroid.lat,
        hood.centroid.lng,
        forward.lat,
        forward.lng
      );
      const level = nominatimForwardLevel(forwardDrift);
      if (level !== 'info') {
        issues.push({
          level,
          cityId: catalogCityId,
          neighborhoodId: hood.id,
          neighborhoodName: hood.name,
          code: 'nominatim_forward_drift',
          message: `Forward geocode drift ${Math.round(forwardDrift)}m vs catalog centroid`,
          catalogCentroid: hood.centroid,
          nominatimCentroid: { lat: forward.lat, lng: forward.lng },
          driftMetersNominatimForward: forwardDrift,
          nominatimDisplayName: forward.displayName,
        });
      }
    }

    const reverse = await nominatimReverse(hood.centroid.lat, hood.centroid.lng);
    await sleep(NOMINATIM_DELAY_MS);

    if (!reverse) {
      issues.push({
        level: 'warn',
        cityId: catalogCityId,
        neighborhoodId: hood.id,
        neighborhoodName: hood.name,
        code: 'nominatim_reverse_miss',
        message: 'Nominatim reverse geocode failed',
        catalogCentroid: hood.centroid,
      });
    } else if (!nameMatchesAnyCandidate(hood.name, reverse.candidates)) {
      const alsoCheckAreas = (hood.areas ?? []).some((a) =>
        nameMatchesAnyCandidate(a, reverse.candidates)
      );
      if (!alsoCheckAreas) {
        issues.push({
          level: 'warn',
          cityId: catalogCityId,
          neighborhoodId: hood.id,
          neighborhoodName: hood.name,
          code: 'nominatim_reverse_name_mismatch',
          message: `Reverse at catalog centroid does not mention "${hood.name}"`,
          catalogCentroid: hood.centroid,
          nominatimDisplayName: reverse.displayName,
          nominatimAddressCandidates: reverse.candidates,
        });
      }
    }
  }

  if (opts.applyDivar && pendingFixes.length > 0) {
    const byId = new Map(catalog.neighborhoods.map((n) => [n.id, { ...n }]));
    for (const { hood, geo } of pendingFixes) {
      const row = byId.get(hood.id);
      if (!row || row.geoSource === 'manual') continue;
      if (geo.centroid) row.centroid = geo.centroid;
      if (geo.bbox) row.bbox = geo.bbox;
      row.geoSource = 'divar';
      fixesApplied += 1;
    }

    await saveCityCatalog(catalogCityId, {
      cityName: catalog.cityName ?? adminCity.name,
      source: catalog.source,
      emptyOnDivar: catalog.emptyOnDivar,
      neighborhoods: [...byId.values()],
    });
    console.log(`  ✓ Applied ${fixesApplied} Divar centroid fixes → ${catalogCityId}`);
  }

  return {
    cityId: catalogCityId,
    cityName: adminCity.name,
    divarCityId,
    divarDistrictCount,
    neighborhoodCount: neighborhoods.length,
    divarMatched,
    nominatimChecked,
    issues,
    fixesApplied,
  };
}

async function resolveTargetCities(
  opts: CrossVerifyOptions,
  divarMap: Record<string, { divarCityId: number }>
): Promise<Array<{ admin: AdminCityRef; divarCityId: number }>> {
  const adminCities = await loadAdminCities();
  const byId = new Map(adminCities.map((c) => [c.id, c]));
  const bySlug = new Map(adminCities.map((c) => [adminSlugForCityId(c.id), c]));

  if (opts.city) {
    const admin = lookupAdminForTierId(opts.city, byId, bySlug);
    if (!admin) throw new Error(`Unknown city: ${opts.city}`);
    const divar = lookupDivarEntry(admin.id, divarMap) ?? lookupDivarEntry(opts.city, divarMap);
    if (!divar) throw new Error(`No Divar mapping for ${admin.name} (${admin.id})`);
    return [{ admin, divarCityId: divar.divarCityId }];
  }

  const tierCfg = loadTierConfig();
  let cityIds: string[] = [];

  if (opts.tier === 'a') {
    cityIds = tierCfg.tierA;
  } else if (opts.tier === 'b') {
    cityIds = Object.keys(divarMap).filter((slug) => !tierCfg.tierA.includes(slug));
  } else {
    cityIds = Object.keys(divarMap);
  }

  const out: Array<{ admin: AdminCityRef; divarCityId: number }> = [];
  for (const tierId of cityIds) {
    const divar = lookupDivarEntry(tierId, divarMap);
    if (!divar) continue;
    const admin = lookupAdminForTierId(tierId, byId, bySlug);
    if (!admin) continue;
    const loaded = await loadCatalogForCity(admin.id);
    if (!loaded?.catalog.neighborhoods.length) continue;
    out.push({ admin, divarCityId: divar.divarCityId });
  }

  return out.sort((a, b) => a.admin.name.localeCompare(b.admin.name, 'fa'));
}

function summarizeReport(report: CrossVerifyReport): void {
  const { summary, cities } = report;
  console.log('\n=== Cross-verify summary ===');
  console.log(
    `Cities: ${summary.cities} | Neighborhoods checked: ${summary.neighborhoods} | Errors: ${summary.errors} | Warnings: ${summary.warnings} | Divar fixes: ${summary.fixesApplied}`
  );

  const topIssues = cities
    .flatMap((c) => c.issues.filter((i) => i.level === 'error'))
    .slice(0, 15);
  if (topIssues.length) {
    console.log('\nTop errors:');
    for (const issue of topIssues) {
      console.log(
        `  • ${issue.cityId}/${issue.neighborhoodName}: ${issue.code} — ${issue.message}`
      );
    }
  }

  const divarDrifts = cities
    .flatMap((c) =>
      c.issues.filter((i) => i.code === 'divar_centroid_drift' && i.driftMetersDivar)
    )
    .sort((a, b) => (b.driftMetersDivar ?? 0) - (a.driftMetersDivar ?? 0))
    .slice(0, 10);
  if (divarDrifts.length) {
    console.log('\nLargest Divar centroid drifts:');
    for (const issue of divarDrifts) {
      console.log(
        `  • ${issue.cityId}/${issue.neighborhoodName}: ${Math.round(issue.driftMetersDivar ?? 0)}m`
      );
    }
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const divarMap = await readDivarCityMap();
  const targets = await resolveTargetCities(opts, divarMap);

  if (!targets.length) {
    console.log('No cities to verify.');
    return;
  }

  console.log(
    `Cross-verify ${targets.length} cities (divar${opts.divarOnly ? '' : ' + nominatim/OSM'})${opts.applyDivar ? ' [APPLY DIVAR]' : ''}`
  );

  const cities: CityCrossVerifyReport[] = [];

  for (const { admin, divarCityId } of targets) {
    console.log(`\n→ ${admin.name} (${admin.id}) divarCityId=${divarCityId}`);
    const cityReport = await verifyCity(admin, divarCityId, opts);
    cities.push(cityReport);
    const errs = cityReport.issues.filter((i) => i.level === 'error').length;
    const warns = cityReport.issues.filter((i) => i.level === 'warn').length;
    console.log(
      `  ${cityReport.neighborhoodCount} hoods | divar matched ${cityReport.divarMatched} | nominatim ${cityReport.nominatimChecked} | errors ${errs} | warns ${warns}`
    );
    await sleep(DIVAR_CITY_DELAY_MS);
  }

  const report: CrossVerifyReport = {
    generatedAt: new Date().toISOString(),
    options: opts,
    cities,
    summary: {
      cities: cities.length,
      neighborhoods: cities.reduce((s, c) => s + c.neighborhoodCount, 0),
      errors: cities.reduce(
        (s, c) => s + c.issues.filter((i) => i.level === 'error').length,
        0
      ),
      warnings: cities.reduce(
        (s, c) => s + c.issues.filter((i) => i.level === 'warn').length,
        0
      ),
      fixesApplied: cities.reduce((s, c) => s + c.fixesApplied, 0),
    },
  };

  ensureDir(REPORTS_DIR);
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const jsonPath = path.join(REPORTS_DIR, `cross-verify-${stamp}.json`);
  writeJson(jsonPath, report);
  writeJson(path.join(REPORTS_DIR, 'latest.json'), report);
  console.log(`\nReport → ${jsonPath}`);

  summarizeReport(report);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
