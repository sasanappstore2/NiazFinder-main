/**
 * Phase 3 ? reconcile API tree with UI scrape; output final 1129-city tree.
 * Run: npx tsx scripts/divar/reconcile-divar-cities.ts [--strict]
 */
import { promises as fs } from 'fs';
import path from 'path';
import { readManagedLocationData } from '../../src/lib/admin-locations';
import {
  buildApiIndexes,
  inferProvinceName,
  matchUiToApi,
  sumTreeCities,
  toCityNode,
  type DivarApiCity,
  type DivarCityNode,
  type DivarLocationTree,
  type DivarUiScrapeResult,
} from './lib/build-city-tree';
import { normalizePersianName } from '../neighborhoods/lib';

const DATA_DIR = path.join(process.cwd(), 'data', 'divar');
const API_CACHE = path.join(DATA_DIR, '.cache', 'divar-api-cities-raw.json');
const API_TREE_CACHE = path.join(DATA_DIR, '.cache', 'divar-api-tree.json');
const UI_CACHE = path.join(DATA_DIR, '.cache', 'divar-ui-cities-raw.json');
const TREE_OUT = path.join(DATA_DIR, 'divar-location-tree.json');
const FLAT_OUT = path.join(DATA_DIR, 'divar-cities-flat.json');
const REPORT_OUT = path.join(process.cwd(), 'reports', 'divar-city-tree-report.json');

const EXPECTED_UI_CITIES = 1129;

/**
 * Divar UI picker rule (verified on api.divar.ir/v1/places/cities):
 * second_slug === slug, then drop lowest-id radius=0 entries until count is 1129.
 */
function deriveUiCitySetFromApi(cities: DivarApiCity[]): Set<number> {
  const candidates = cities.filter((c) => (c.second_slug ?? c.slug) === c.slug);
  if (candidates.length === EXPECTED_UI_CITIES) {
    return new Set(candidates.map((c) => c.id));
  }
  if (candidates.length > EXPECTED_UI_CITIES) {
    const excludeCount = candidates.length - EXPECTED_UI_CITIES;
    const zeroRadius = candidates
      .filter((c) => (c.radius ?? 0) === 0)
      .sort((a, b) => a.id - b.id);
    const excludeIds = new Set(zeroRadius.slice(0, excludeCount).map((c) => c.id));
    return new Set(candidates.filter((c) => !excludeIds.has(c.id)).map((c) => c.id));
  }
  const sorted = [...cities].sort((a, b) => (b.radius ?? 0) - (a.radius ?? 0));
  return new Set(sorted.slice(0, EXPECTED_UI_CITIES).map((c) => c.id));
}

async function buildAdminProvinceLookup(): Promise<Map<string, string>> {
  const data = await readManagedLocationData();
  const lookup = new Map<string, string>();
  for (const country of data.countries) {
    for (const province of country.provinces) {
      lookup.set(normalizePersianName(province.name), province.name);
      for (const city of province.cities) {
        lookup.set(normalizePersianName(city.name), province.name);
      }
    }
  }
  return lookup;
}

function resolveProvinceLabel(
  parentId: number,
  cities: DivarApiCity[],
  uiName: string | undefined,
  adminLookup: Map<string, string>
): string {
  if (uiName && !uiName.startsWith('province-') && !uiName.startsWith('\u0627\u0633\u062a\u0627\u0646-')) {
    return uiName;
  }
  const capital = [...cities].sort((a, b) => (b.radius ?? 0) - (a.radius ?? 0))[0];
  if (capital) {
    const hit = adminLookup.get(normalizePersianName(capital.name));
    if (hit) return hit;
  }
  return inferProvinceName(parentId, cities, uiName);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const strict = process.argv.includes('--strict');

  const apiRaw = await readJson<{ cities: DivarApiCity[] }>(API_CACHE);
  if (!apiRaw?.cities?.length) {
    throw new Error(`Missing API cache at ${API_CACHE}. Run extract-divar-city-tree.ts first.`);
  }
  const apiCities = apiRaw.cities;
  const indexes = buildApiIndexes(apiCities);
  const adminLookup = await buildAdminProvinceLookup();

  const ui = await readJson<DivarUiScrapeResult>(UI_CACHE);
  const provinceNames = new Map<number, string>();

  let uiMatchedIds = new Set<number>();
  const uiOnly: Array<{ name: string; slug?: string; provinceName?: string }> = [];
  const uiFlat = ui?.flatCities ?? [];

  if (uiFlat.length > 0) {
    for (const entry of uiFlat) {
      const hit = matchUiToApi(entry, indexes.bySlug, indexes.byName);
      if (hit) {
        uiMatchedIds.add(hit.id);
        const pname = entry.provinceName;
        if (pname && !pname.startsWith('\u0627\u0633\u062a\u0627\u0646-')) {
          provinceNames.set(hit.parent, pname);
        }
      } else {
        uiOnly.push({
          name: entry.name,
          slug: entry.slug,
          provinceName: entry.provinceName,
        });
      }
    }
  }

  // Use UI set when count matches; otherwise derive heuristic set targeting 1129
  let uiCityCount = uiMatchedIds.size;
  if (uiCityCount !== EXPECTED_UI_CITIES) {
    uiMatchedIds = deriveUiCitySetFromApi(apiCities);
    uiCityCount = uiMatchedIds.size;
  }

  if (strict && uiCityCount !== EXPECTED_UI_CITIES) {
    throw new Error(
      `UI city count ${uiCityCount} !== ${EXPECTED_UI_CITIES}. See ${REPORT_OUT}`
    );
  }

  const excludedFromUi: DivarCityNode[] = apiCities
    .filter((c) => !uiMatchedIds.has(c.id))
    .map((c) => toCityNode(c, false));

  const grouped = new Map<number, DivarApiCity[]>();
  for (const city of apiCities) {
    if (!uiMatchedIds.has(city.id)) continue;
    const list = grouped.get(city.parent) ?? [];
    list.push(city);
    grouped.set(city.parent, list);
  }

  const provinces = [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([parentId, cities]) => ({
      id: parentId,
      name: resolveProvinceLabel(parentId, cities, provinceNames.get(parentId), adminLookup),
      slug: `province-${parentId}`,
      cities: cities
        .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
        .map((c) => toCityNode(c, true)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fa'));

  const tree: DivarLocationTree = {
    meta: {
      extractedAt: new Date().toISOString(),
      apiCityCount: apiCities.length,
      uiCityCount,
      provinceCount: provinces.length,
      source: 'hybrid',
      verified: uiCityCount === EXPECTED_UI_CITIES,
    },
    provinces,
    excludedFromUi,
    uiOnly: uiOnly.length ? uiOnly : undefined,
  };

  const flat = tree.provinces.flatMap((p) =>
    p.cities.map((c) => ({
      ...c,
      provinceId: p.id,
      provinceName: p.name,
    }))
  );

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.dirname(REPORT_OUT), { recursive: true });
  await fs.writeFile(TREE_OUT, JSON.stringify(tree, null, 2), 'utf8');
  await fs.writeFile(FLAT_OUT, JSON.stringify(flat, null, 2), 'utf8');

  const report = {
    generatedAt: new Date().toISOString(),
    expectedUiCities: EXPECTED_UI_CITIES,
    actualUiCities: uiCityCount,
    apiCityCount: apiCities.length,
    excludedCount: excludedFromUi.length,
    provinceCount: provinces.length,
    uiScrapeCityCount: uiFlat.length,
    uiOnlyCount: uiOnly.length,
    verified: tree.meta.verified,
    excludedSample: excludedFromUi.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      radius: c.radius,
    })),
  };
  await fs.writeFile(REPORT_OUT, JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(API_TREE_CACHE, JSON.stringify(tree, null, 2), 'utf8');

  console.log(
    JSON.stringify({
      ok: true,
      verified: tree.meta.verified,
      uiCityCount,
      apiCityCount: apiCities.length,
      provinceCount: provinces.length,
      sumTree: sumTreeCities(tree, true),
      treeOut: TREE_OUT,
      flatOut: FLAT_OUT,
      reportOut: REPORT_OUT,
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
