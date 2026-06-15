/**
 * Sync Divar UI cities (1129) with admin-locations.json.
 *
 * Default: dry-run + report. Use --apply to write files.
 *
 *   npm run divar:sync-admin-cities
 *   npm run divar:sync-admin-cities:apply
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  makeUniqueLocationId,
  readManagedLocationData,
  writeManagedLocationData,
} from '../../src/lib/admin-locations';
import type { ManagedCity, ManagedLocationData, ManagedProvince } from '@/lib/locations/managed-types';
import {
  adminSlugForCityId,
  loadManualMap,
  normalizePersianName,
  NEIGHBORHOODS_ROOT,
} from '../neighborhoods/lib';

const ROOT = process.cwd();
const FLAT_PATH = path.join(ROOT, 'data/divar/divar-cities-flat.json');
const HUB_OVERRIDES_PATH = path.join(ROOT, 'src/data/geo/divar-hub-overrides.json');
const CITY_MAP_PATH = path.join(NEIGHBORHOODS_ROOT, 'divar-city-map.json');
const REPORT_PATH = path.join(ROOT, 'reports/divar-admin-sync-report.json');

const EXPECTED_UI_CITIES = 1129;

/** Divar hub slug variants that differ from admin city ids. */
const HUB_SLUG_ALIASES: Record<string, string[]> = {
  shahrud: ['shahrood', 'shahrud'],
  kerman: ['kerman', 'kerman-city'],
  bushehr: ['bushehr', 'bushehr-city'],
  kermanshah: ['kermanshah', 'kermanshah-city'],
  ilam: ['ilam', 'ilam-city'],
};

interface DivarFlatCity {
  id: number;
  name: string;
  slug: string;
  parent: number;
  provinceId: number;
  provinceName: string;
  inUi: boolean;
  radius?: number;
}

interface CityMapEntry {
  divarCityId: number;
  divarSlug: string;
  matchMethod: string;
}

interface AdminCityRef {
  id: string;
  name: string;
  nameEn: string;
  provinceId: string;
  provinceName: string;
  neighborhoodCount: number;
  city: ManagedCity;
}

interface MatchedEntry {
  adminId: string;
  divarSlug: string;
  divarId: number;
  provinceId: string;
  method: string;
}

interface ToAddEntry {
  proposedId: string;
  name: string;
  nameEn: string;
  provinceId: string;
  provinceName: string;
  divarSlug: string;
  divarId: number;
  idCollision?: boolean;
}

interface AmbiguousEntry {
  divarSlug: string;
  divarName: string;
  divarId: number;
  reason: string;
  candidates?: string[];
}

interface SyncReport {
  summary: {
    divarUiCities: number;
    adminBefore: number;
    adminAfter: number;
    matched: number;
    toAdd: number;
    ambiguous: number;
    mapUpdates: number;
    dryRun: boolean;
  };
  matched: MatchedEntry[];
  toAdd: ToAddEntry[];
  ambiguous: AmbiguousEntry[];
  unmappedDivar: string[];
  orphanAdmin: string[];
}

function isInvalidProvinceName(name: string): boolean {
  const t = name.trim();
  return t.startsWith('province-') || t.startsWith('?????-');
}

function buildReverseSlugMap(
  cityMap: Record<string, CityMapEntry>,
  manual: Record<string, string>
): Map<string, string> {
  const reverse = new Map<string, string>();
  for (const [adminId, entry] of Object.entries(cityMap)) {
    const slug = entry.divarSlug.toLowerCase();
    if (!reverse.has(slug)) reverse.set(slug, adminId);
  }
  for (const [adminId, slug] of Object.entries(manual)) {
    reverse.set(slug.toLowerCase(), adminId);
  }
  return reverse;
}

function collectAdminCities(data: ManagedLocationData): AdminCityRef[] {
  const refs: AdminCityRef[] = [];
  for (const country of data.countries) {
    for (const province of country.provinces) {
      for (const city of province.cities) {
        refs.push({
          id: city.id,
          name: city.name,
          nameEn: city.nameEn,
          provinceId: province.id,
          provinceName: province.name,
          neighborhoodCount: city.neighborhoods?.length ?? 0,
          city,
        });
      }
    }
  }
  return refs;
}

function buildProvinceNameIndex(provinces: ManagedProvince[]): Map<string, ManagedProvince> {
  const byName = new Map<string, ManagedProvince>();
  for (const province of provinces) {
    byName.set(normalizePersianName(province.name), province);
  }
  return byName;
}

function buildCitiesByParent(flat: DivarFlatCity[]): Map<number, DivarFlatCity[]> {
  const map = new Map<number, DivarFlatCity[]>();
  for (const city of flat) {
    const list = map.get(city.parent) ?? [];
    list.push(city);
    map.set(city.parent, list);
  }
  return map;
}

function hubSlugVariants(hubSlug: string): Set<string> {
  const variants = new Set([hubSlug.toLowerCase()]);
  for (const alias of HUB_SLUG_ALIASES[hubSlug] ?? []) {
    variants.add(alias.toLowerCase());
  }
  return variants;
}

function cityOrderInProvince(
  provinces: ManagedProvince[],
  provinceId: string,
  cityId: string
): number | undefined {
  const province = provinces.find((p) => p.id === provinceId);
  return province?.cities.find((c) => c.id === cityId)?.order;
}

function pickBestAdminMatch(
  matches: AdminCityRef[],
  provinces: ManagedProvince[]
): AdminCityRef | undefined {
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  const capital = matches.find((m) => cityOrderInProvince(provinces, m.provinceId, m.id) === 1);
  return capital ?? matches[0];
}

function findAdminCitiesBySlug(
  adminCities: AdminCityRef[],
  slug: string
): AdminCityRef[] {
  const variants = hubSlugVariants(slug);
  return adminCities.filter(
    (c) =>
      variants.has(adminSlugForCityId(c.id).toLowerCase()) ||
      variants.has(c.nameEn.toLowerCase()) ||
      variants.has(c.id.toLowerCase())
  );
}

function buildParentToAdminProvince(
  hubByParent: Record<string, string>,
  cityMap: Record<string, CityMapEntry>,
  provinces: ManagedProvince[],
  adminCities: AdminCityRef[]
): Map<number, ManagedProvince> {
  const result = new Map<number, ManagedProvince>();

  for (const [parentStr, hubSlug] of Object.entries(hubByParent)) {
    const parentId = Number(parentStr);

    const mapHits = Object.entries(cityMap).filter(
      ([, entry]) => entry.divarSlug.toLowerCase() === hubSlug.toLowerCase()
    );
    if (mapHits.length > 0) {
      const refs = mapHits.flatMap(([adminId]) =>
        adminCities.filter((c) => c.id === adminId)
      );
      const best = pickBestAdminMatch(refs, provinces);
      if (best) {
        const province = provinces.find((p) => p.id === best.provinceId);
        if (province) {
          result.set(parentId, province);
          continue;
        }
      }
    }

    const slugMatches = findAdminCitiesBySlug(adminCities, hubSlug);
    const best = pickBestAdminMatch(slugMatches, provinces);
    if (best) {
      const province = provinces.find((p) => p.id === best.provinceId);
      if (province) result.set(parentId, province);
    }
  }

  return result;
}

function resolveAdminProvince(
  divar: DivarFlatCity,
  provinces: ManagedProvince[],
  provinceByName: Map<string, ManagedProvince>,
  parentToProvince: Map<number, ManagedProvince>,
  adminCities: AdminCityRef[],
  citiesByParent: Map<number, DivarFlatCity[]>
): { province: ManagedProvince; method: string } | null {
  if (!isInvalidProvinceName(divar.provinceName)) {
    const hit = provinceByName.get(normalizePersianName(divar.provinceName));
    if (hit) return { province: hit, method: 'provinceName' };
  }

  const fromParent = parentToProvince.get(divar.parent);
  if (fromParent) return { province: fromParent, method: 'hubOverride' };

  const cluster = citiesByParent.get(divar.parent) ?? [];
  const capital = [...cluster].sort((a, b) => (b.radius ?? 0) - (a.radius ?? 0))[0];
  if (capital) {
    const byCapitalName = provinceByName.get(normalizePersianName(capital.name));
    if (byCapitalName) return { province: byCapitalName, method: 'capitalName' };

    const capitalMatches = adminCities.filter(
      (c) => normalizePersianName(c.name) === normalizePersianName(capital.name)
    );
    const capitalAdmin = pickBestAdminMatch(capitalMatches, provinces);
    if (capitalAdmin) {
      const province = provinces.find((p) => p.id === capitalAdmin.provinceId);
      if (province) return { province, method: 'capitalAdminCity' };
    }
  }

  return null;
}

function citiesInProvince(adminCities: AdminCityRef[], provinceId: string): AdminCityRef[] {
  return adminCities.filter((c) => c.provinceId === provinceId);
}

function matchDivarToAdmin(
  divar: DivarFlatCity,
  province: ManagedProvince,
  reverseSlugMap: Map<string, string>,
  provinceCities: AdminCityRef[]
): { admin: AdminCityRef; method: string } | { ambiguous: AmbiguousEntry } | null {
  const slugLower = divar.slug.toLowerCase();

  const fromMap = reverseSlugMap.get(slugLower);
  if (fromMap) {
    const hits = provinceCities.filter((c) => c.id === fromMap);
    if (hits.length === 1) return { admin: hits[0], method: 'existing-map' };
    if (hits.length > 1) {
      return {
        ambiguous: {
          divarSlug: divar.slug,
          divarName: divar.name,
          divarId: divar.id,
          reason: 'existing-map: multiple admin cities in province',
          candidates: hits.map((h) => h.id),
        },
      };
    }
    const globalHit = provinceCities.find((c) => c.id === fromMap);
    if (!globalHit) {
      /* mapped to city in another province ? try other methods */
    }
  }

  const slugMatches = provinceCities.filter(
    (c) => adminSlugForCityId(c.id).toLowerCase() === slugLower
  );
  if (slugMatches.length === 1) return { admin: slugMatches[0], method: 'slug-id' };
  if (slugMatches.length > 1) {
    return {
      ambiguous: {
        divarSlug: divar.slug,
        divarName: divar.name,
        divarId: divar.id,
        reason: 'slug-id: multiple matches in province',
        candidates: slugMatches.map((h) => h.id),
      },
    };
  }

  const nameEnMatches = provinceCities.filter((c) => c.nameEn.toLowerCase() === slugLower);
  if (nameEnMatches.length === 1) return { admin: nameEnMatches[0], method: 'nameEn' };
  if (nameEnMatches.length > 1) {
    return {
      ambiguous: {
        divarSlug: divar.slug,
        divarName: divar.name,
        divarId: divar.id,
        reason: 'nameEn: multiple matches in province',
        candidates: nameEnMatches.map((h) => h.id),
      },
    };
  }

  const normName = normalizePersianName(divar.name);
  const nameMatches = provinceCities.filter(
    (c) => normalizePersianName(c.name) === normName
  );
  if (nameMatches.length === 1) return { admin: nameMatches[0], method: 'name' };
  if (nameMatches.length > 1) {
    return {
      ambiguous: {
        divarSlug: divar.slug,
        divarName: divar.name,
        divarId: divar.id,
        reason: 'name: multiple matches in province',
        candidates: nameMatches.map((h) => h.id),
      },
    };
  }

  return null;
}

function proposeAdminId(
  divar: DivarFlatCity,
  globalIds: Set<string>,
  data: ManagedLocationData
): { id: string; idCollision: boolean } {
  const slug = divar.slug;
  if (!globalIds.has(slug)) {
    return { id: slug, idCollision: false };
  }
  return { id: makeUniqueLocationId(divar.name, data), idCollision: true };
}

async function loadCityMap(): Promise<Record<string, CityMapEntry>> {
  try {
    const raw = await fs.readFile(CITY_MAP_PATH, 'utf8');
    return JSON.parse(raw) as Record<string, CityMapEntry>;
  } catch {
    return {};
  }
}

async function runSync(apply: boolean): Promise<SyncReport> {
  const flatRaw = await fs.readFile(FLAT_PATH, 'utf8');
  const flatAll = JSON.parse(flatRaw) as DivarFlatCity[];
  const divarCities = flatAll.filter((c) => c.inUi !== false);

  if (divarCities.length !== EXPECTED_UI_CITIES) {
    throw new Error(`Expected ${EXPECTED_UI_CITIES} UI cities, got ${divarCities.length}`);
  }

  const data = await readManagedLocationData();
  const provinces = data.countries.flatMap((c) => c.provinces);
  const adminCities = collectAdminCities(data);
  const adminBefore = adminCities.length;
  const globalIds = new Set<string>();
  const duplicateAdminIds = new Set<string>();
  for (const city of adminCities) {
    if (globalIds.has(city.id)) duplicateAdminIds.add(city.id);
    globalIds.add(city.id);
  }
  if (duplicateAdminIds.size > 0) {
    console.warn(
      `Warning: ${duplicateAdminIds.size} duplicate admin city id(s): ${[...duplicateAdminIds].join(', ')}`
    );
  }

  const hubRaw = await fs.readFile(HUB_OVERRIDES_PATH, 'utf8');
  const hubOverrides = JSON.parse(hubRaw) as { byParent: Record<string, string> };

  const cityMap = await loadCityMap();
  const manual = await loadManualMap();
  const reverseSlugMap = buildReverseSlugMap(cityMap, manual);
  const provinceByName = buildProvinceNameIndex(provinces);
  const citiesByParent = buildCitiesByParent(divarCities);
  const parentToProvince = buildParentToAdminProvince(
    hubOverrides.byParent,
    cityMap,
    provinces,
    adminCities
  );

  const matched: MatchedEntry[] = [];
  const toAdd: ToAddEntry[] = [];
  const ambiguous: AmbiguousEntry[] = [];
  const matchedAdminIds = new Set<string>();
  const divarSlugToAdminId = new Map<string, { adminId: string; method: string }>();

  for (const divar of divarCities) {
    const provinceResult = resolveAdminProvince(
      divar,
      provinces,
      provinceByName,
      parentToProvince,
      adminCities,
      citiesByParent
    );

    if (!provinceResult) {
      ambiguous.push({
        divarSlug: divar.slug,
        divarName: divar.name,
        divarId: divar.id,
        reason: 'province unresolved',
      });
      continue;
    }

    const { province } = provinceResult;
    const provinceCities = citiesInProvince(adminCities, province.id);
    const matchResult = matchDivarToAdmin(divar, province, reverseSlugMap, provinceCities);

    if (matchResult && 'ambiguous' in matchResult) {
      ambiguous.push(matchResult.ambiguous);
      continue;
    }

    if (matchResult && 'admin' in matchResult) {
      const { admin, method } = matchResult;
      const existing = divarSlugToAdminId.get(divar.slug.toLowerCase());
      if (existing && existing.adminId !== admin.id) {
        ambiguous.push({
          divarSlug: divar.slug,
          divarName: divar.name,
          divarId: divar.id,
          reason: 'divar slug maps to multiple admin cities',
          candidates: [existing.adminId, admin.id],
        });
        continue;
      }

      matched.push({
        adminId: admin.id,
        divarSlug: divar.slug,
        divarId: divar.id,
        provinceId: province.id,
        method,
      });
      matchedAdminIds.add(admin.id);
      divarSlugToAdminId.set(divar.slug.toLowerCase(), { adminId: admin.id, method });
      continue;
    }

    const { id: proposedId, idCollision } = proposeAdminId(divar, globalIds, data);
    if (globalIds.has(proposedId) && !idCollision) {
      ambiguous.push({
        divarSlug: divar.slug,
        divarName: divar.name,
        divarId: divar.id,
        reason: 'proposed id already exists',
        candidates: [proposedId],
      });
      continue;
    }

    toAdd.push({
      proposedId,
      name: divar.name,
      nameEn: divar.slug,
      provinceId: province.id,
      provinceName: province.name,
      divarSlug: divar.slug,
      divarId: divar.id,
      idCollision: idCollision || undefined,
    });
    globalIds.add(proposedId);
    matchedAdminIds.add(proposedId);
    divarSlugToAdminId.set(divar.slug.toLowerCase(), { adminId: proposedId, method: 'new' });
  }

  const unmappedDivar = divarCities
    .filter((d) => !divarSlugToAdminId.has(d.slug.toLowerCase()))
    .map((d) => d.slug);

  const orphanAdmin = adminCities
    .filter((c) => !matchedAdminIds.has(c.id))
    .map((c) => c.id);

  const mapUpdates = matched.length + toAdd.length;

  const report: SyncReport = {
    summary: {
      divarUiCities: divarCities.length,
      adminBefore,
      adminAfter: adminBefore + toAdd.length,
      matched: matched.length,
      toAdd: toAdd.length,
      ambiguous: ambiguous.length,
      mapUpdates,
      dryRun: !apply,
    },
    matched,
    toAdd,
    ambiguous,
    unmappedDivar,
    orphanAdmin,
  };

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  if (apply) {
    if (ambiguous.length > 0) {
      throw new Error(
        `Cannot apply: ${ambiguous.length} ambiguous entries. Fix manual map and re-run dry-run.`
      );
    }
    if (unmappedDivar.length > 0) {
      throw new Error(`Cannot apply: ${unmappedDivar.length} unmapped Divar cities.`);
    }

    const nextData = JSON.parse(JSON.stringify(data)) as ManagedLocationData;

    for (const entry of toAdd) {
      const province = nextData.countries
        .flatMap((c) => c.provinces)
        .find((p) => p.id === entry.provinceId);
      if (!province) {
        throw new Error(`Province not found for toAdd: ${entry.provinceId}`);
      }
      const maxOrder = province.cities.reduce((m, c) => Math.max(m, c.order), 0);
      const newCity: ManagedCity = {
        id: entry.proposedId,
        name: entry.name,
        nameEn: entry.nameEn,
        isActive: true,
        order: maxOrder + 1,
        neighborhoods: [],
      };
      province.cities.push(newCity);
    }

    await writeManagedLocationData(nextData);

    const newMap: Record<string, CityMapEntry> = {};
    for (const m of matched) {
      newMap[m.adminId] = {
        divarCityId: m.divarId,
        divarSlug: m.divarSlug,
        matchMethod: m.method,
      };
    }
    for (const a of toAdd) {
      newMap[a.proposedId] = {
        divarCityId: a.divarId,
        divarSlug: a.divarSlug,
        matchMethod: 'new',
      };
    }

    await fs.writeFile(CITY_MAP_PATH, JSON.stringify(newMap, null, 2), 'utf8');
    report.summary.dryRun = false;
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  }

  return report;
}

function printSummary(report: SyncReport): void {
  const s = report.summary;
  console.log('\n=== Divar ? Admin city sync ===');
  console.log(`Mode: ${s.dryRun ? 'DRY-RUN' : 'APPLIED'}`);
  console.log(`Divar UI cities: ${s.divarUiCities}`);
  console.log(`Admin cities before: ${s.adminBefore}`);
  console.log(`Matched: ${s.matched}`);
  console.log(`To add: ${s.toAdd}`);
  console.log(`Ambiguous: ${s.ambiguous}`);
  console.log(`Orphan admin (no Divar UI match): ${report.orphanAdmin.length}`);
  console.log(`Report: ${REPORT_PATH}`);

  if (report.ambiguous.length > 0) {
    console.log('\nAmbiguous (first 10):');
    for (const a of report.ambiguous.slice(0, 10)) {
      console.log(`  - ${a.divarSlug} (${a.divarName}): ${a.reason}`);
    }
  }

  if (s.dryRun && s.ambiguous === 0 && report.unmappedDivar.length === 0) {
    console.log('\nReady for apply: npm run divar:sync-admin-cities:apply');
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const report = await runSync(apply);
  printSummary(report);

  if (report.summary.ambiguous > 0 && !apply) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
