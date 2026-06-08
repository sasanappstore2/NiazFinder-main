/**
 * Merge colloquial aliases + missing neighborhoods into catalog JSON files.
 * Run: npm run neighborhoods:apply-supplements
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  clearCatalogCache,
  loadCityCatalogFile,
  rebuildManifestFromCatalog,
  saveCityCatalog,
  slugifyNeighborhoodNames,
} from '../../src/lib/neighborhoods/catalog';
import type { CatalogNeighborhood } from '../../src/lib/neighborhoods/catalog-types';
import { makeLocationId } from '../../src/lib/admin-locations';

const SUPPLEMENTS_DIR = path.join(process.cwd(), 'src/data/neighborhoods/supplements');

interface SupplementPatch {
  matchId?: string;
  matchName?: string;
  addAreas?: string[];
}

interface SupplementAdd {
  id: string;
  name: string;
  nameEn?: string;
  areas?: string[];
}

interface CitySupplement {
  cityId: string;
  patches?: SupplementPatch[];
  add?: SupplementAdd[];
}

function mergeAreas(existing: string[] | undefined, extra: string[]): string[] {
  const set = new Set((existing ?? []).map((a) => a.trim()).filter(Boolean));
  for (const a of extra) {
    const t = a.trim();
    if (t) set.add(t);
  }
  return [...set];
}

function normalizeMatchName(value: string): string {
  return value.replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
}

function findNeighborhood(
  list: CatalogNeighborhood[],
  patch: SupplementPatch
): CatalogNeighborhood | undefined {
  if (patch.matchId) {
    return list.find((n) => n.id === patch.matchId);
  }
  if (patch.matchName) {
    const key = normalizeMatchName(patch.matchName);
    return list.find((n) => {
      const name = normalizeMatchName(n.name);
      return name === key || name.includes(key) || key.includes(name);
    });
  }
  return undefined;
}

async function loadSupplements(): Promise<CitySupplement[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(SUPPLEMENTS_DIR)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const out: CitySupplement[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(SUPPLEMENTS_DIR, file), 'utf8');
    out.push(JSON.parse(raw) as CitySupplement);
  }
  return out;
}

async function applyCitySupplement(sup: CitySupplement): Promise<{ patched: number; added: number }> {
  clearCatalogCache();
  const catalog = await loadCityCatalogFile(sup.cityId);
  if (!catalog) {
    console.warn(`Skip ${sup.cityId}: no catalog file`);
    return { patched: 0, added: 0 };
  }

  let patched = 0;
  for (const patch of sup.patches ?? []) {
    const hood = findNeighborhood(catalog.neighborhoods, patch);
    if (!hood || !patch.addAreas?.length) continue;
    const before = hood.areas?.length ?? 0;
    hood.areas = mergeAreas(hood.areas, patch.addAreas);
    if ((hood.areas?.length ?? 0) > before) patched += 1;
  }

  const existingIds = new Set(catalog.neighborhoods.map((n) => n.id));
  const existingNames = new Set(catalog.neighborhoods.map((n) => n.name));
  const toAdd: CatalogNeighborhood[] = [];

  for (const row of sup.add ?? []) {
    const id = row.id.trim() || makeLocationId(row.name);
    if (existingIds.has(id) || existingNames.has(row.name)) continue;
    toAdd.push({
      id,
      name: row.name,
      nameEn: row.nameEn ?? id,
      ...(row.areas?.length ? { areas: row.areas } : {}),
    });
  }

  if (toAdd.length) {
    const slugged = slugifyNeighborhoodNames(
      toAdd.map((n) => ({ name: n.name, areas: n.areas }))
    );
    catalog.neighborhoods.push(...slugged);
    catalog.neighborhoods.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }

  await saveCityCatalog(sup.cityId, {
    cityName: catalog.cityName,
    source: catalog.source === 'divar' ? 'divar' : catalog.source,
    emptyOnDivar: catalog.emptyOnDivar,
    neighborhoods: catalog.neighborhoods,
  });

  return { patched, added: toAdd.length };
}

async function main(): Promise<void> {
  const supplements = await loadSupplements();
  if (!supplements.length) {
    console.log('No supplements found');
    return;
  }

  let totalPatched = 0;
  let totalAdded = 0;
  for (const sup of supplements) {
    const { patched, added } = await applyCitySupplement(sup);
    totalPatched += patched;
    totalAdded += added;
    console.log(`${sup.cityId}: ${patched} patches, ${added} new neighborhoods`);
  }

  const manifest = await rebuildManifestFromCatalog();
  console.log(
    `\nManifest: ${manifest.citiesWithNeighborhoods} cities, ${manifest.totalNeighborhoods} neighborhoods (+${totalAdded} new, ${totalPatched} alias patches)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
