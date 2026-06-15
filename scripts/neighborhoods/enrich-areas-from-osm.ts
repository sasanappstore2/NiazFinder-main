/**
 * Enrich neighborhood areas from OSM named highways inside each bbox.
 * Run: npm run neighborhoods:enrich-areas
 */
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import {
  listCatalogCityIds,
  loadCityCatalogFile,
  saveCityCatalog,
} from '../../src/lib/neighborhoods/catalog';
import type { CatalogNeighborhood, NeighborhoodBbox } from '../../src/lib/neighborhoods/catalog-types';
import {
  displayAreaLabels,
  sanitizeAreaLabel,
  sanitizeAreaLabels,
} from '../../src/lib/neighborhoods/area-labels';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';
import { adminSlugForCityId, normalizePersianName, parseArgs, sleep } from './lib';
import { cityBboxFromConfig } from './geo-lib';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'NiazFinder-NeighborhoodEnrich/1.0 (contact@needfinder.ir)';
const CACHE_DIR = path.join(process.cwd(), 'data/neighborhoods/cache/osm-streets');
const MAX_AREAS_PER_HOOD = 8;
const OVERPASS_DELAY_MS = 500;

interface NamedWay {
  name: string;
  lat: number;
  lng: number;
}

function parseEnrichArgs(argv: string[]): {
  city?: string;
  onlyEmpty?: boolean;
  force?: boolean;
} {
  const base = parseArgs(argv);
  let onlyEmpty = false;
  let force = false;
  for (const arg of argv) {
    if (arg === '--only-empty') onlyEmpty = true;
    if (arg === '--force') force = true;
  }
  return { city: base.city, onlyEmpty, force };
}

function pointInBbox(lat: number, lng: number, bbox: NeighborhoodBbox): boolean {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

function hoodBbox(hood: CatalogNeighborhood): NeighborhoodBbox | null {
  if (hood.bbox) return hood.bbox;
  if (!hood.centroid) return null;
  const pad = 0.004;
  return {
    south: hood.centroid.lat - pad,
    north: hood.centroid.lat + pad,
    west: hood.centroid.lng - pad,
    east: hood.centroid.lng + pad,
  };
}

function cachePath(cityId: string, bboxKey: string): string {
  const hash = createHash('sha1').update(bboxKey).digest('hex').slice(0, 12);
  return path.join(CACHE_DIR, `${cityId}-${hash}.json`);
}

async function fetchNamedHighways(bbox: NeighborhoodBbox): Promise<NamedWay[]> {
  const query = `
[out:json][timeout:90];
way["highway"]["name"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
out center tags;
`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!res.ok) {
        lastError = new Error(`Overpass HTTP ${res.status}`);
        if (res.status === 429 || res.status >= 500) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        throw lastError;
      }

      const json = (await res.json()) as {
    elements?: Array<{
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };

      const ways: NamedWay[] = [];
      for (const el of json.elements ?? []) {
        const name = el.tags?.['name:fa']?.trim() || el.tags?.name?.trim();
        if (!name || name.length < 2) continue;
        const lat = el.center?.lat ?? el.lat;
        const lng = el.center?.lon ?? el.lon;
        if (lat == null || lng == null) continue;
        ways.push({ name: normalizePersianName(name), lat, lng });
      }

      return ways;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await sleep(2000 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('Overpass query failed');
}

async function loadOrFetchCityWays(
  cityId: string,
  cityBbox: NeighborhoodBbox
): Promise<NamedWay[]> {
  const bboxKey = `${cityBbox.south},${cityBbox.west},${cityBbox.north},${cityBbox.east}`;
  const file = cachePath(cityId, bboxKey);

  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as NamedWay[];
  } catch {
    // cache miss
  }

  const ways = await fetchNamedHighways(cityBbox);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(ways, null, 2), 'utf8');
  return ways;
}

function streetsForHood(hood: CatalogNeighborhood, ways: NamedWay[]): string[] {
  const bbox = hoodBbox(hood);
  if (!bbox) return [];

  const counts = new Map<string, number>();
  for (const way of ways) {
    if (!pointInBbox(way.lat, way.lng, bbox)) continue;
    const label = sanitizeAreaLabel(way.name, hood.name);
    if (!label) continue;
    if (label.toLowerCase() === hood.name.toLowerCase()) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fa'))
    .map(([name]) => name)
    .slice(0, MAX_AREAS_PER_HOOD);
}

function mergeAreas(
  existing: string[] | undefined,
  extra: string[],
  hoodName: string
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string) => {
    const label = sanitizeAreaLabel(raw, hoodName);
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(label);
  };
  for (const label of sanitizeAreaLabels(existing, hoodName)) add(label);
  for (const label of extra) add(label);
  return out.slice(0, MAX_AREAS_PER_HOOD);
}

async function enrichCity(
  cityId: string,
  opts: { onlyEmpty: boolean; force: boolean }
): Promise<number> {
  const catalog = await loadCityCatalogFile(cityId);
  if (!catalog?.neighborhoods?.length) return 0;

  const slug = adminSlugForCityId(cityId);
  const cityBbox = cityBboxFromConfig(slug) ?? cityBboxFromConfig(locationCityIdToSlug(cityId));
  if (!cityBbox) {
    console.warn(`  skip ${cityId}: no city bbox config`);
    return 0;
  }

  const ways = await loadOrFetchCityWays(cityId, cityBbox);
  await sleep(OVERPASS_DELAY_MS);

  let patched = 0;
  for (const hood of catalog.neighborhoods) {
    const current = displayAreaLabels(hood.areas, hood.name);
    if (opts.onlyEmpty && current.length > 0 && !opts.force) continue;

    const streets = streetsForHood(hood, ways);
    if (!streets.length) continue;

    const merged = mergeAreas(hood.areas, streets, hood.name);
    const mergedDisplay = displayAreaLabels(merged, hood.name);
    if (!opts.force && mergedDisplay.length <= current.length) continue;

    hood.areas = merged.length ? merged : undefined;
    patched += 1;
  }

  if (patched > 0) {
    await saveCityCatalog(cityId, {
      cityName: catalog.cityName,
      source: catalog.source,
      emptyOnDivar: catalog.emptyOnDivar,
      neighborhoods: catalog.neighborhoods,
    });
  }

  return patched;
}

async function main(): Promise<void> {
  const { city, onlyEmpty, force } = parseEnrichArgs(process.argv.slice(2));
  const cityIds = city ? [city] : await listCatalogCityIds();

  let totalPatched = 0;
  let failedCities = 0;
  for (const cityId of cityIds) {
    try {
      const patched = await enrichCity(cityId, { onlyEmpty: onlyEmpty ?? true, force: force ?? false });
      if (patched > 0) {
        console.log(`ok ${cityId}: enriched ${patched} neighborhoods`);
        totalPatched += patched;
      }
    } catch (err) {
      failedCities += 1;
      console.warn(
        `warn ${cityId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(`\nEnriched ${totalPatched} neighborhoods total (${failedCities} cities skipped on error)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
