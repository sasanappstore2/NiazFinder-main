/**
 * Import neighborhoods from Divar places API into per-city catalog files.
 *
 * Run:
 *   npm run neighborhoods:import
 *   npm run neighborhoods:import:city -- --city=mashhad
 *   npm run neighborhoods:import:gaps
 *   npm run neighborhoods:import:merge-all
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  CACHE_DIR,
  REPORTS_DIR,
  NEIGHBORHOODS_ROOT,
  type AdminCityRef,
  type DivarCity,
  buildDivarIndexes,
  fetchDivarCities,
  loadAdminCities,
  loadManualMap,
  resolveDivarCity,
  sleep,
  adminSlugForCityId,
} from './lib';
import {
  districtsToNeighborhoods,
  fetchDistricts,
  mergeCatalogNeighborhoods,
  type MergeStats,
} from './divar-districts';
import {
  loadCityCatalogFile,
  rebuildManifestFromCatalog,
  saveCityCatalog,
  writeManifest,
} from '../../src/lib/neighborhoods/catalog';

const RATE_LIMIT_MS = 280;
const IMPORT_REPORT_PATH = path.join(REPORTS_DIR, 'divar-neighborhoods-import-report.json');

interface CityMapEntry {
  divarCityId: number;
  divarSlug: string;
  matchMethod: string;
}

interface ImportCityResult {
  count: number;
  merged: number;
  added: number;
  kept: number;
  skipped: boolean;
}

interface CityReportRow {
  cityId: string;
  cityName: string;
  divarCityId: number;
  divarSlug: string;
  count: number;
  merged: number;
  added: number;
  kept: number;
  method: string;
  skipped?: boolean;
}

interface ImportReport {
  summary: {
    processed: number;
    imported: number;
    merged: number;
    added: number;
    skipped: number;
    failed: number;
    emptyOnDivar: number;
    totalNeighborhoods: number;
    gapsOnly: boolean;
    refreshAll: boolean;
    merge: boolean;
  };
  cities: CityReportRow[];
  failed: Array<{ cityId: string; cityName: string; error: string }>;
}

export interface ImportOptions {
  city?: string;
  refreshCities?: boolean;
  force?: boolean;
  gapsOnly?: boolean;
  refreshAll?: boolean;
  merge?: boolean;
  retry?: number;
}

export function parseImportArgs(argv: string[]): ImportOptions {
  const opts: ImportOptions = { retry: 3 };
  for (const arg of argv) {
    if (arg === '--refresh-cities') opts.refreshCities = true;
    if (arg === '--force') opts.force = true;
    if (arg === '--gaps-only') opts.gapsOnly = true;
    if (arg === '--refresh-all') opts.refreshAll = true;
    if (arg === '--merge') opts.merge = true;
    if (arg.startsWith('--city=')) opts.city = arg.slice('--city='.length);
    if (arg.startsWith('--retry=')) opts.retry = Number(arg.slice('--retry='.length)) || 3;
  }
  return opts;
}

async function readCityMap(): Promise<Record<string, CityMapEntry>> {
  const out = path.join(NEIGHBORHOODS_ROOT, 'divar-city-map.json');
  try {
    const raw = await fs.readFile(out, 'utf8');
    return JSON.parse(raw) as Record<string, CityMapEntry>;
  } catch {
    return {};
  }
}

async function writeCityMap(updates: Record<string, CityMapEntry>) {
  const out = path.join(NEIGHBORHOODS_ROOT, 'divar-city-map.json');
  const existing = await readCityMap();
  await fs.writeFile(out, JSON.stringify({ ...existing, ...updates }, null, 2), 'utf8');
}

async function writeUnmappedReport(rows: { id: string; name: string }[]) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const csv = ['adminCityId,adminCityName', ...rows.map((r) => `${r.id},${r.name}`)].join('\n');
  const out = path.join(REPORTS_DIR, 'unmapped-cities.csv');
  await fs.writeFile(out, csv, 'utf8');
  console.log(`Unmapped cities (${rows.length}) → ${out}`);
}

async function writeImportReport(report: ImportReport): Promise<void> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(IMPORT_REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Import report → ${IMPORT_REPORT_PATH}`);
}

async function shouldSkipCity(
  adminCity: AdminCityRef,
  opts: ImportOptions
): Promise<boolean> {
  if (opts.refreshAll || opts.force) return false;
  if (!opts.gapsOnly) return false;

  const existing = await loadCityCatalogFile(adminCity.id);
  const count = existing?.neighborhoods?.length ?? 0;
  return count > 0;
}

async function importCity(
  adminCity: AdminCityRef,
  divarCity: DivarCity,
  opts: ImportOptions
): Promise<ImportCityResult> {
  const districts = await fetchDistricts(divarCity.id, opts.retry ?? 3);
  const incoming = districtsToNeighborhoods(districts);
  const existing = await loadCityCatalogFile(adminCity.id);
  const existingCount = existing?.neighborhoods?.length ?? 0;

  if (incoming.length === 0 && !opts.force) {
    if (existingCount > 0) {
      console.log(
        `  ↷ ${adminCity.name}: Divar empty — keeping existing ${existingCount} neighborhoods`
      );
      return { count: existingCount, merged: 0, added: 0, kept: existingCount, skipped: false };
    }
  }

  let neighborhoods = incoming;
  let stats: MergeStats = { merged: 0, added: incoming.length, kept: 0 };

  if (opts.merge && existing?.neighborhoods?.length) {
    const merged = mergeCatalogNeighborhoods(existing.neighborhoods, incoming);
    neighborhoods = merged.neighborhoods;
    stats = merged.stats;
    console.log(
      `  ↻ ${adminCity.name}: merge ${stats.merged} updated, ${stats.added} added, ${stats.kept} kept`
    );
  } else if (opts.force && existing?.source === 'osm' && incoming.length > 0) {
    console.log(`  ↻ ${adminCity.name}: replacing OSM catalog with Divar (${incoming.length})`);
  }

  await saveCityCatalog(adminCity.id, {
    cityName: adminCity.name,
    source: 'divar',
    emptyOnDivar: neighborhoods.length === 0,
    neighborhoods,
  });

  return {
    count: neighborhoods.length,
    merged: stats.merged,
    added: stats.added,
    kept: stats.kept,
    skipped: false,
  };
}

async function selectTargets(
  adminCities: AdminCityRef[],
  cityMap: Record<string, CityMapEntry>,
  opts: ImportOptions
): Promise<AdminCityRef[]> {
  const mappedIds = new Set(Object.keys(cityMap));
  let targets = opts.gapsOnly || opts.refreshAll
    ? adminCities.filter((c) => mappedIds.has(c.id))
    : adminCities;

  if (opts.city) {
    targets = adminCities.filter(
      (c) => c.id === opts.city || adminSlugForCityId(c.id) === opts.city
    );
  }

  if (opts.gapsOnly && !opts.refreshAll) {
    const filtered: AdminCityRef[] = [];
    for (const city of targets) {
      const existing = await loadCityCatalogFile(city.id);
      const count = existing?.neighborhoods?.length ?? 0;
      if (count === 0) filtered.push(city);
    }
    return filtered;
  }

  return targets;
}

export async function runDivarImport(opts: ImportOptions): Promise<ImportReport> {
  if (opts.refreshCities) {
    const cachePath = path.join(CACHE_DIR, 'divar-cities.json');
    await fs.unlink(cachePath).catch(() => undefined);
  }

  const adminCities = await loadAdminCities();
  const existingCityMap = await readCityMap();
  const targets = await selectTargets(adminCities, existingCityMap, opts);

  if (opts.city && targets.length === 0) {
    throw new Error(`City "${opts.city}" not found in admin-locations`);
  }

  const divarCities = await fetchDivarCities();
  const indexes = buildDivarIndexes(divarCities);
  const manual = await loadManualMap();

  const cityMap: Record<string, CityMapEntry> = {};
  const unmapped: { id: string; name: string }[] = [];
  const emptyOnDivar: string[] = [];
  const failed: ImportReport['failed'] = [];
  const cityRows: CityReportRow[] = [];

  let imported = 0;
  let skipped = 0;
  let totalMerged = 0;
  let totalAdded = 0;
  let totalNeighborhoods = 0;

  console.log(
    `Import mode: gapsOnly=${!!opts.gapsOnly} refreshAll=${!!opts.refreshAll} merge=${!!opts.merge} targets=${targets.length}`
  );

  for (const adminCity of targets) {
    const mapped = existingCityMap[adminCity.id];
    let divarCity: DivarCity | undefined;
    let method = mapped?.matchMethod ?? 'map';

    if (mapped) {
      divarCity = divarCities.find((c) => c.id === mapped.divarCityId);
      if (!divarCity) {
        divarCity = [...indexes.bySlug.values()].find(
          (c) => c.slug.toLowerCase() === mapped.divarSlug.toLowerCase()
        );
      }
    }

    if (!divarCity) {
      const resolved = resolveDivarCity(adminCity, indexes, manual);
      if (!resolved) {
        unmapped.push({ id: adminCity.id, name: adminCity.name });
        continue;
      }
      divarCity = resolved.city;
      method = resolved.method;
    }

    cityMap[adminCity.id] = {
      divarCityId: divarCity.id,
      divarSlug: divarCity.slug,
      matchMethod: method,
    };

    if (await shouldSkipCity(adminCity, opts)) {
      skipped += 1;
      const existing = await loadCityCatalogFile(adminCity.id);
      const count = existing?.neighborhoods?.length ?? 0;
      cityRows.push({
        cityId: adminCity.id,
        cityName: adminCity.name,
        divarCityId: divarCity.id,
        divarSlug: divarCity.slug,
        count,
        merged: 0,
        added: 0,
        kept: count,
        method,
        skipped: true,
      });
      continue;
    }

    try {
      const result = await importCity(adminCity, divarCity, opts);
      imported += 1;
      totalNeighborhoods += result.count;
      totalMerged += result.merged;
      totalAdded += result.added;
      if (result.count === 0) emptyOnDivar.push(adminCity.id);
      cityRows.push({
        cityId: adminCity.id,
        cityName: adminCity.name,
        divarCityId: divarCity.id,
        divarSlug: divarCity.slug,
        count: result.count,
        merged: result.merged,
        added: result.added,
        kept: result.kept,
        method,
      });
      console.log(`✓ ${adminCity.name} (${adminCity.id}): ${result.count} neighborhoods [${method}]`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ cityId: adminCity.id, cityName: adminCity.name, error: message });
      console.error(`✗ ${adminCity.name}:`, message);
    }

    await sleep(RATE_LIMIT_MS);
  }

  if (Object.keys(cityMap).length > 0) {
    await writeCityMap(cityMap);
  }
  if (!opts.city) await writeUnmappedReport(unmapped);

  const manifest = await rebuildManifestFromCatalog();
  const allAdmin = await loadAdminCities();
  const fullMap = await readCityMap();
  const mappedIds = new Set(Object.keys(fullMap));
  manifest.emptyOnDivar = opts.city
    ? manifest.emptyOnDivar
    : [...new Set([...(manifest.emptyOnDivar ?? []), ...emptyOnDivar])];
  manifest.unmapped = allAdmin.filter((c) => !mappedIds.has(c.id)).map((c) => c.id);
  await writeManifest(manifest);

  const report: ImportReport = {
    summary: {
      processed: targets.length,
      imported,
      merged: totalMerged,
      added: totalAdded,
      skipped,
      failed: failed.length,
      emptyOnDivar: emptyOnDivar.length,
      totalNeighborhoods,
      gapsOnly: !!opts.gapsOnly,
      refreshAll: !!opts.refreshAll,
      merge: !!opts.merge,
    },
    cities: cityRows,
    failed,
  };

  await writeImportReport(report);

  console.log('\n---');
  console.log(`Processed: ${targets.length}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Merged neighborhoods: ${totalMerged}`);
  console.log(`Added neighborhoods: ${totalAdded}`);
  console.log(`Total neighborhoods: ${totalNeighborhoods}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Unmapped: ${unmapped.length}`);
  console.log(`Empty on Divar: ${emptyOnDivar.length}`);

  return report;
}

async function main() {
  const opts = parseImportArgs(process.argv.slice(2));
  const report = await runDivarImport(opts);
  if (report.summary.failed > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
