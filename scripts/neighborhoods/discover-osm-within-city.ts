/**
 * Discover OSM place names inside a city bbox and merge into the local catalog:
 * - missing names → add as area under the containing neighborhood
 * - misplaced areas → optionally relocate to the hood whose bbox contains the OSM point
 * - unmatched place tags → optional new neighborhood rows
 *
 * Run:
 *   npm run neighborhoods:discover-osm -- --city=mashhad
 *   npm run neighborhoods:discover-osm:apply -- --city=mashhad
 *   npm run neighborhoods:discover-osm:apply -- --p0
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { CatalogNeighborhood, NeighborhoodBbox } from '../../src/lib/neighborhoods/catalog-types';
import {
  loadCityCatalogFile,
  rebuildManifestFromCatalog,
  resolveCatalogCityIdCandidates,
  saveCityCatalog,
  slugifyNeighborhoodNames,
} from '../../src/lib/neighborhoods/catalog';
import { makeLocationId } from '../../src/lib/admin-locations';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';
import { sanitizeAreaLabel } from '../../src/lib/neighborhoods/area-labels';
import {
  adminSlugForCityId,
  loadAdminCities,
  normalizePersianName,
  sleep,
  type AdminCityRef,
} from './lib';
import { cityBboxFromConfig, matchScore, normalizeMatchName } from './geo-lib';
import { REPORTS_DIR } from './lib';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'NiazFinder-OsmDiscover/1.0 (contact@needfinder.ir)';
const OVERPASS_DELAY_MS = 800;

const P0_CITY_IDS = [
  'mashhad',
  'tehran-city',
  'isfahan-city',
  'shiraz',
  'karaj',
  'qom-city',
  'tabriz',
  'ahvaz',
];

type OsmKind = 'place' | 'boundary' | 'highway';

interface OsmDiscovery {
  name: string;
  lat: number;
  lng: number;
  kind: OsmKind;
}

interface HoodSpatial {
  hood: CatalogNeighborhood;
  bbox: NeighborhoodBbox;
  area: number;
}

interface DiscoverAction {
  type: 'add_area' | 'relocate_area' | 'add_hood' | 'skip';
  name: string;
  reason: string;
  targetHoodId?: string;
  targetHoodName?: string;
  fromHoodId?: string;
  fromHoodName?: string;
}

function parseDiscoverArgs(argv: string[]): {
  city?: string;
  p0?: boolean;
  apply?: boolean;
  relocate?: boolean;
  addHoods?: boolean;
} {
  let city: string | undefined;
  let p0 = false;
  let apply = false;
  let relocate = true;
  let addHoods = false;

  for (const arg of argv) {
    if (arg === '--p0') p0 = true;
    if (arg === '--apply') apply = true;
    if (arg === '--no-relocate') relocate = false;
    if (arg === '--add-hoods') addHoods = true;
    if (arg.startsWith('--city=')) city = arg.slice('--city='.length);
  }

  return { city, p0, apply, relocate, addHoods };
}

function hoodBbox(hood: CatalogNeighborhood): NeighborhoodBbox | null {
  if (hood.bbox) return hood.bbox;
  if (!hood.centroid) return null;
  const pad = 0.0035;
  return {
    south: hood.centroid.lat - pad,
    north: hood.centroid.lat + pad,
    west: hood.centroid.lng - pad,
    east: hood.centroid.lng + pad,
  };
}

function bboxArea(b: NeighborhoodBbox): number {
  return Math.max(0, b.north - b.south) * Math.max(0, b.east - b.west);
}

function pointInBbox(lat: number, lng: number, bbox: NeighborhoodBbox): boolean {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

function centroidFromGeometry(geometry: Array<{ lat: number; lon: number }>): { lat: number; lng: number } | null {
  if (!geometry.length) return null;
  let lat = 0;
  let lng = 0;
  for (const p of geometry) {
    lat += p.lat;
    lng += p.lon;
  }
  return { lat: lat / geometry.length, lng: lng / geometry.length };
}

async function fetchOsmDiscoveries(
  south: number,
  west: number,
  north: number,
  east: number,
  cacheKey: string
): Promise<OsmDiscovery[]> {
  const cacheDir = path.join(process.cwd(), 'src/data/neighborhoods/.cache/osm-discover');
  await fs.mkdir(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, `${cacheKey}.json`);

  try {
    const cached = await fs.readFile(cachePath, 'utf8');
    return JSON.parse(cached) as OsmDiscovery[];
  } catch {
    /* fetch */
  }

  const placeTypes = 'neighbourhood|suburb|quarter|locality|hamlet|village';
  const query = `
[out:json][timeout:120];
(
  node["place"~"${placeTypes}"]["name"](${south},${west},${north},${east});
  node["place"~"${placeTypes}"]["name:fa"](${south},${west},${north},${east});
  way["place"~"${placeTypes}"]["name"](${south},${west},${north},${east});
  way["place"~"${placeTypes}"]["name:fa"](${south},${west},${north},${east});
  relation["place"~"${placeTypes}"]["name"](${south},${west},${north},${east});
  relation["boundary"="administrative"]["admin_level"~"8|9|10"]["name"](${south},${west},${north},${east});
);
out center;
out geom;
`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      if (attempt > 0) await sleep(8000 * attempt);
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
        if (res.status === 429 || res.status === 504 || res.status >= 500) {
          await sleep(3000 * (attempt + 1));
          continue;
        }
        throw lastError;
      }

      const json = (await res.json()) as {
        elements?: Array<{
          type: string;
          tags?: Record<string, string>;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          geometry?: Array<{ lat: number; lon: number }>;
        }>;
      };

      const byName = new Map<string, OsmDiscovery>();

      for (const el of json.elements ?? []) {
        const tags = el.tags ?? {};
        const rawName = tags['name:fa']?.trim() || tags.name?.trim();
        if (!rawName || rawName.length < 2) continue;
        if (/^iran$/i.test(rawName) || rawName === '\u0627\u06CC\u0631\u0627\u0646') continue;

        let lat = el.lat ?? el.center?.lat;
        let lng = el.lon ?? el.center?.lon;
        if ((lat == null || lng == null) && el.geometry?.length) {
          const c = centroidFromGeometry(el.geometry);
          if (c) {
            lat = c.lat;
            lng = c.lng;
          }
        }
        if (lat == null || lng == null) continue;

        let kind: OsmKind = 'place';
        if (tags.boundary === 'administrative') kind = 'boundary';
        else if (tags.highway) kind = 'highway';

        const label = sanitizeAreaLabel(rawName, rawName) ?? rawName;
        const key = normalizeMatchName(label);
        const prev = byName.get(key);
        if (prev && prev.kind === 'place' && kind === 'highway') continue;
        byName.set(key, { name: label, lat, lng, kind });
      }

      const discoveries = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'fa'));
      await fs.writeFile(cachePath, JSON.stringify(discoveries, null, 2), 'utf8');
      return discoveries;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await sleep(3000 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('Overpass discover failed');
}

async function loadCatalogForAdminCity(adminCityId: string): Promise<{
  catalogCityId: string;
  catalog: NonNullable<Awaited<ReturnType<typeof loadCityCatalogFile>>>;
} | null> {
  for (const candidate of resolveCatalogCityIdCandidates(adminCityId)) {
    const file = await loadCityCatalogFile(candidate);
    if (file?.neighborhoods?.length) {
      return { catalogCityId: candidate, catalog: file };
    }
  }
  return null;
}

function buildSpatialIndex(hoods: CatalogNeighborhood[]): HoodSpatial[] {
  const out: HoodSpatial[] = [];
  for (const hood of hoods) {
    const bbox = hoodBbox(hood);
    if (!bbox) continue;
    out.push({ hood, bbox, area: bboxArea(bbox) });
  }
  return out;
}

function findContainingHood(spatial: HoodSpatial[], lat: number, lng: number): HoodSpatial | null {
  const hits = spatial.filter((s) => pointInBbox(lat, lng, s.bbox));
  if (!hits.length) return null;
  hits.sort((a, b) => a.area - b.area);
  return hits[0] ?? null;
}

function findHoodByName(hoods: CatalogNeighborhood[], name: string): CatalogNeighborhood | null {
  const key = normalizeMatchName(name);
  for (const hood of hoods) {
    if (normalizeMatchName(hood.name) === key || normalizeMatchName(hood.id) === key) {
      return hood;
    }
    if (matchScore(hood.name, name) >= 0.95) return hood;
  }
  return null;
}

function findAreaOwner(
  hoods: CatalogNeighborhood[],
  areaName: string
): { hood: CatalogNeighborhood; area: string } | null {
  const key = normalizeMatchName(areaName);
  for (const hood of hoods) {
    for (const area of hood.areas ?? []) {
      if (normalizeMatchName(area) === key || matchScore(area, areaName) >= 0.95) {
        return { hood, area };
      }
    }
  }
  return null;
}

function mergeAreas(existing: string[] | undefined, extra: string[]): string[] {
  const set = new Set((existing ?? []).map((a) => a.trim()).filter(Boolean));
  for (const a of extra) {
    const t = a.trim();
    if (t) set.add(t);
  }
  return [...set];
}

function planDiscoverActions(
  hoods: CatalogNeighborhood[],
  spatial: HoodSpatial[],
  discoveries: OsmDiscovery[],
  opts: { relocate: boolean; addHoods: boolean }
): DiscoverAction[] {
  const actions: DiscoverAction[] = [];

  for (const disc of discoveries) {
    if (disc.kind === 'highway' && disc.name.length < 4) {
      actions.push({ type: 'skip', name: disc.name, reason: 'highway too short' });
      continue;
    }

    const asHood = findHoodByName(hoods, disc.name);
    if (asHood) {
      actions.push({ type: 'skip', name: disc.name, reason: 'already a neighborhood' });
      continue;
    }

    const owner = findAreaOwner(hoods, disc.name);
    const container = findContainingHood(spatial, disc.lat, disc.lng);

    if (owner) {
      if (
        opts.relocate &&
        container &&
        owner.hood.id !== container.hood.id &&
        disc.kind !== 'highway'
      ) {
        actions.push({
          type: 'relocate_area',
          name: disc.name,
          reason: 'osm point in different parent bbox',
          targetHoodId: container.hood.id,
          targetHoodName: container.hood.name,
          fromHoodId: owner.hood.id,
          fromHoodName: owner.hood.name,
        });
      } else {
        actions.push({ type: 'skip', name: disc.name, reason: 'already an area alias' });
      }
      continue;
    }

    if (container) {
      actions.push({
        type: 'add_area',
        name: disc.name,
        reason: `inside ${container.hood.name}`,
        targetHoodId: container.hood.id,
        targetHoodName: container.hood.name,
      });
      continue;
    }

    if (opts.addHoods && disc.kind !== 'highway') {
      actions.push({
        type: 'add_hood',
        name: disc.name,
        reason: 'osm place without containing hood bbox',
      });
      continue;
    }

    actions.push({ type: 'skip', name: disc.name, reason: 'no containing neighborhood bbox' });
  }

  return actions;
}

function applyActions(
  hoods: CatalogNeighborhood[],
  actions: DiscoverAction[]
): { addedAreas: number; relocated: number; addedHoods: number } {
  const byId = new Map(hoods.map((h) => [h.id, h]));
  let addedAreas = 0;
  let relocated = 0;
  let addedHoods = 0;

  for (const action of actions) {
    if (action.type === 'add_area' && action.targetHoodId) {
      const hood = byId.get(action.targetHoodId);
      if (!hood) continue;
      const before = hood.areas?.length ?? 0;
      hood.areas = mergeAreas(hood.areas, [action.name]);
      if ((hood.areas?.length ?? 0) > before) addedAreas += 1;
      continue;
    }

    if (
      action.type === 'relocate_area' &&
      action.targetHoodId &&
      action.fromHoodId
    ) {
      const from = byId.get(action.fromHoodId);
      const to = byId.get(action.targetHoodId);
      if (!from || !to) continue;

      const key = normalizeMatchName(action.name);
      const filtered = (from.areas ?? []).filter((a) => normalizeMatchName(a) !== key);
      if (filtered.length !== (from.areas?.length ?? 0)) {
        from.areas = filtered.length ? filtered : undefined;
      }

      const before = to.areas?.length ?? 0;
      to.areas = mergeAreas(to.areas, [action.name]);
      if ((to.areas?.length ?? 0) > before || filtered.length !== (from.areas?.length ?? 0)) {
        relocated += 1;
      }
      continue;
    }

    if (action.type === 'add_hood') {
      const id = makeLocationId(action.name);
      if (byId.has(id) || [...byId.values()].some((h) => h.name === action.name)) continue;
      const [created] = slugifyNeighborhoodNames([{ name: action.name, geoSource: 'osm' }]);
      if (!created) continue;
      hoods.push(created);
      byId.set(created.id, created);
      addedHoods += 1;
    }
  }

  hoods.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  return { addedAreas, relocated, addedHoods };
}

async function discoverCity(
  adminCity: AdminCityRef,
  opts: { apply: boolean; relocate: boolean; addHoods: boolean }
): Promise<{
  cityId: string;
  discoveries: number;
  actions: DiscoverAction[];
  applied?: { addedAreas: number; relocated: number; addedHoods: number };
}> {
  const loaded = await loadCatalogForAdminCity(adminCity.id);
  if (!loaded) {
    console.warn(`Skip ${adminCity.name}: no catalog`);
    return { cityId: adminCity.id, discoveries: 0, actions: [] };
  }

  const slug = adminSlugForCityId(adminCity.id);
  const cityBbox =
    cityBboxFromConfig(slug) ?? cityBboxFromConfig(locationCityIdToSlug(adminCity.id));
  if (!cityBbox) {
    console.warn(`Skip ${adminCity.name}: no city bbox config`);
    return { cityId: adminCity.id, discoveries: 0, actions: [] };
  }

  const discoveries = await fetchOsmDiscoveries(
    cityBbox.south,
    cityBbox.west,
    cityBbox.north,
    cityBbox.east,
    normalizeMatchName(loaded.catalogCityId)
  );
  await sleep(OVERPASS_DELAY_MS);

  const hoods = loaded.catalog.neighborhoods;
  const spatial = buildSpatialIndex(hoods);
  const actions = planDiscoverActions(hoods, spatial, discoveries, opts);

  const summary = {
    add_area: actions.filter((a) => a.type === 'add_area').length,
    relocate_area: actions.filter((a) => a.type === 'relocate_area').length,
    add_hood: actions.filter((a) => a.type === 'add_hood').length,
    skip: actions.filter((a) => a.type === 'skip').length,
  };

  console.log(
    `${adminCity.name} (${loaded.catalogCityId}): ${discoveries.length} osm names → +${summary.add_area} areas, ↻${summary.relocate_area} relocate, +${summary.add_hood} hoods`
  );

  let applied: { addedAreas: number; relocated: number; addedHoods: number } | undefined;

  if (opts.apply) {
    applied = applyActions(hoods, actions);
    await saveCityCatalog(loaded.catalogCityId, {
      cityName: loaded.catalog.cityName ?? adminCity.name,
      source: loaded.catalog.source,
      emptyOnDivar: loaded.catalog.emptyOnDivar,
      neighborhoods: hoods,
    });
    console.log(
      `  applied: +${applied.addedAreas} areas, ${applied.relocated} relocated, +${applied.addedHoods} hoods`
    );
  }

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, `osm-discover-${loaded.catalogCityId}.json`);
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        cityId: loaded.catalogCityId,
        cityName: adminCity.name,
        applied: opts.apply,
        discoveries: discoveries.length,
        summary,
        notable: actions.filter((a) => a.type !== 'skip').slice(0, 200),
        appliedStats: applied,
      },
      null,
      2
    ),
    'utf8'
  );

  return { cityId: loaded.catalogCityId, discoveries: discoveries.length, actions, applied };
}

async function main(): Promise<void> {
  const { city, p0, apply, relocate, addHoods } = parseDiscoverArgs(process.argv.slice(2));
  const adminCities = await loadAdminCities();

  let targets: AdminCityRef[];
  if (city) {
    targets = adminCities.filter(
      (c) => c.id === city || adminSlugForCityId(c.id) === city || locationCityIdToSlug(c.id) === city
    );
    if (!targets.length) {
      console.error(`City "${city}" not found`);
      process.exit(1);
    }
  } else if (p0) {
    targets = adminCities.filter((c) => P0_CITY_IDS.includes(c.id));
  } else {
    console.error('Pass --city=slug or --p0');
    process.exit(1);
  }

  console.log(
    `OSM discover: ${targets.length} cities, apply=${apply}, relocate=${relocate}, addHoods=${addHoods}`
  );

  let totalAddedAreas = 0;
  let totalRelocated = 0;
  let totalAddedHoods = 0;

  for (const adminCity of targets) {
    try {
      const result = await discoverCity(adminCity, { apply, relocate, addHoods });
      if (result.applied) {
        totalAddedAreas += result.applied.addedAreas;
        totalRelocated += result.applied.relocated;
        totalAddedHoods += result.applied.addedHoods;
      }
    } catch (err) {
      console.error(`✗ ${adminCity.name}:`, err instanceof Error ? err.message : err);
    }
  }

  if (apply) {
    const manifest = await rebuildManifestFromCatalog();
    console.log('\n---');
    console.log(`Applied totals: +${totalAddedAreas} areas, ${totalRelocated} relocated, +${totalAddedHoods} hoods`);
    console.log(`Manifest: ${manifest.totalNeighborhoods} neighborhoods in ${manifest.citiesWithNeighborhoods} cities`);
  } else {
    console.log('\nDry run — pass --apply to write catalogs. Reports in reports/osm-discover-*.json');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
