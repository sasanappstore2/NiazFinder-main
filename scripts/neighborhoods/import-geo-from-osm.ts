/**
 * Import neighborhood polygons from OSM Overpass (where available).
 * Falls back to keeping existing synthetic polygons for unmatched hoods.
 *
 * Run:
 *   npx tsx scripts/neighborhoods/import-geo-from-osm.ts
 *   npx tsx scripts/neighborhoods/import-geo-from-osm.ts --city=mashhad
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { Feature, Polygon } from 'geojson';
import {
  listCatalogCityIds,
  loadCityCatalogFile,
  resolveCatalogCityIdCandidates,
  saveCityCatalog,
} from '../../src/lib/neighborhoods/catalog';
import {
  loadCityGeoFile,
  saveCityGeoFile,
  syncCatalogGeoFields,
  writeGeoManifest,
} from '../../src/lib/neighborhoods/geo';
import type { CityNeighborhoodGeoCollection } from '../../src/lib/neighborhoods/geo-types';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';
import { loadAdminCities, parseArgs, sleep } from './lib';
import {
  GEO_CACHE_DIR,
  cityBboxFromConfig,
  ensureGeoDirs,
  makeGeoFeature,
  matchScore,
  normalizeMatchName,
  syntheticNeighborhoodPolygon,
} from './geo-lib';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'NiazFinder-NeighborhoodGeo/1.0';
const OVERPASS_DELAY_MS = 600;

type OsmElement = {
  type: 'way' | 'relation' | 'node';
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  geometry?: Array<{ lat: number; lon: number }>;
  members?: Array<{ type: string; ref: number; role: string }>;
};

function ringFromGeometry(geometry: Array<{ lat: number; lon: number }>): number[][] {
  const ring = geometry.map((p) => [p.lon, p.lat]);
  if (ring.length > 0) {
    const first = ring[0]!;
    const last = ring[ring.length - 1]!;
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([...first]);
    }
  }
  return ring;
}

function polygonFromElement(el: OsmElement): Polygon | null {
  if (el.geometry?.length && el.geometry.length >= 3) {
    return { type: 'Polygon', coordinates: [ringFromGeometry(el.geometry)] };
  }
  return null;
}

function nameFromElement(el: OsmElement): string | null {
  const tags = el.tags ?? {};
  return tags.name?.trim() || tags['name:fa']?.trim() || null;
}

async function fetchOsmPolygons(
  south: number,
  west: number,
  north: number,
  east: number,
  cacheKey: string
): Promise<OsmElement[]> {
  await fs.mkdir(GEO_CACHE_DIR, { recursive: true });
  const cachePath = path.join(GEO_CACHE_DIR, `${cacheKey}.json`);
  try {
    const cached = await fs.readFile(cachePath, 'utf8');
    return JSON.parse(cached) as OsmElement[];
  } catch {
    /* fetch */
  }

  const query = `
[out:json][timeout:90];
(
  way["place"~"suburb|neighbourhood|quarter"](${south},${west},${north},${east});
  relation["place"~"suburb|neighbourhood|quarter"](${south},${west},${north},${east});
  way["boundary"="administrative"]["admin_level"~"9|10"](${south},${west},${north},${east});
);
out geom;
`;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const json = (await res.json()) as { elements?: OsmElement[] };
  const elements = json.elements ?? [];
  await fs.writeFile(cachePath, JSON.stringify(elements), 'utf8');
  return elements;
}

function bestOsmMatch(
  hoodName: string,
  elements: OsmElement[]
): { element: OsmElement; score: number } | null {
  let best: { element: OsmElement; score: number } | null = null;
  for (const el of elements) {
    const name = nameFromElement(el);
    if (!name) continue;
    const score = matchScore(hoodName, name);
    if (score < 0.72) continue;
    if (!best || score > best.score) best = { element: el, score };
  }
  return best;
}

async function importCityGeo(cityId: string): Promise<{ osm: number; synthetic: number }> {
  const catalog = await loadCityCatalogFile(cityId);
  if (!catalog?.neighborhoods?.length) return { osm: 0, synthetic: 0 };

  const citySlug = locationCityIdToSlug(cityId);
  const cityBbox = cityBboxFromConfig(citySlug);
  if (!cityBbox) return { osm: 0, synthetic: 0 };

  let elements: OsmElement[] = [];
  try {
    elements = await fetchOsmPolygons(
      cityBbox.south,
      cityBbox.west,
      cityBbox.north,
      cityBbox.east,
      normalizeMatchName(cityId)
    );
  } catch (err) {
    console.warn(`  ↷ ${cityId}: Overpass failed — ${err instanceof Error ? err.message : err}`);
  }

  const existingGeo = await loadCityGeoFile(cityId);
  const existingById = new Map(
    (existingGeo?.features ?? []).map((f) => [f.properties.id, f])
  );

  let osmCount = 0;
  const features: Feature<Polygon, { id: string; name: string; geoSource: 'osm' | 'synthetic' }>[] =
    [];

  for (const hood of catalog.neighborhoods) {
    const match = bestOsmMatch(hood.name, elements);
    const polygon = match ? polygonFromElement(match.element) : null;
    if (polygon) {
      features.push(makeGeoFeature(hood.id, hood.name, polygon, 'osm'));
      osmCount += 1;
      continue;
    }

    const prev = existingById.get(hood.id);
    if (prev) {
      features.push(prev);
      continue;
    }

    features.push(
      makeGeoFeature(
        hood.id,
        hood.name,
        syntheticNeighborhoodPolygon({
          cityBbox,
          index: catalog.neighborhoods.indexOf(hood),
          count: catalog.neighborhoods.length,
          seed: `${cityId}:${hood.id}`,
        }),
        'synthetic'
      )
    );
  }

  const collection: CityNeighborhoodGeoCollection = {
    type: 'FeatureCollection',
    features,
  };

  await saveCityGeoFile(cityId, collection);
  const synced = syncCatalogGeoFields(catalog.neighborhoods, features);
  await saveCityCatalog(cityId, {
    cityName: catalog.cityName,
    source: catalog.source,
    emptyOnDivar: catalog.emptyOnDivar,
    neighborhoods: synced,
  });

  return { osm: osmCount, synthetic: features.length - osmCount };
}

async function main(): Promise<void> {
  const { city: onlyCity } = parseArgs(process.argv.slice(2));
  await ensureGeoDirs();

  let cityIds = await listCatalogCityIds();
  if (onlyCity) {
    const admin = await loadAdminCities();
    const hit = admin.find((c) => c.id === onlyCity || locationCityIdToSlug(c.id) === onlyCity);
    if (!hit) {
      console.error(`City "${onlyCity}" not found`);
      process.exit(1);
    }
    cityIds = resolveCatalogCityIdCandidates(hit.id).filter((id) => cityIds.includes(id));
  }

  const cities: Record<
    string,
    { cityId: string; featureCount: number; osm: number; divar: number; synthetic: number; manual: number }
  > = {};
  let total = 0;

  for (const cityId of cityIds) {
    const catalog = await loadCityCatalogFile(cityId);
    if (!catalog?.neighborhoods?.length) continue;

    const { osm, synthetic } = await importCityGeo(cityId);
    const featureCount = catalog.neighborhoods.length;
    cities[cityId] = {
      cityId,
      featureCount,
      osm,
      divar: 0,
      synthetic,
      manual: 0,
    };
    total += featureCount;
    console.log(`✓ ${cityId}: ${osm} OSM + ${synthetic} synthetic`);
    await sleep(OVERPASS_DELAY_MS);
  }

  await writeGeoManifest({
    version: 1,
    updatedAt: new Date().toISOString(),
    cities,
    totalFeatures: total,
  });

  console.log(`\nGeo import done: ${total} features`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
