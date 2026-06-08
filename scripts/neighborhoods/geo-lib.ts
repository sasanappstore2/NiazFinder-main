import { promises as fs } from 'fs';
import path from 'path';
import type { Feature, Polygon } from 'geojson';
import { readJson, ROOT } from '../geo/shared';
import type { NeighborhoodGeoSource } from '../../src/lib/neighborhoods/catalog-types';
import type { NeighborhoodGeoProperties } from '../../src/lib/neighborhoods/geo-types';

export const GEO_DIR = path.join(ROOT, 'src/data/neighborhoods/geo');
export const GEO_CACHE_DIR = path.join(ROOT, 'src/data/neighborhoods/.cache/osm-geo');
export const GEO_MANIFEST_PATH = path.join(ROOT, 'src/data/neighborhoods/geo-manifest.json');

export type CityMapConfig = {
  lat: number;
  lng: number;
  bboxDelta: { lat: number; lng: number };
  pinBboxDelta?: { lat: number; lng: number };
};

export function loadCityMapConfig(slug: string): CityMapConfig | null {
  const data = readJson<{ cities: Record<string, CityMapConfig> }>(
    path.join(ROOT, 'src/data/geo/iran-cities-map-config.json')
  );
  return data.cities[slug] ?? data.cities[slug.toLowerCase()] ?? null;
}

export function normalizeMatchName(value: string): string {
  return value
    .replace(/\u200c/g, ' ')
    .replace(/[يی]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[أإآا]/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

export function matchScore(a: string, b: string): number {
  const na = normalizeMatchName(a);
  const nb = normalizeMatchName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.92;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  return Math.max(0, 1 - dist / maxLen);
}

export function cityBboxFromConfig(slug: string): {
  south: number;
  north: number;
  west: number;
  east: number;
} | null {
  const cfg = loadCityMapConfig(slug);
  if (!cfg) return null;
  const delta = cfg.pinBboxDelta ?? cfg.bboxDelta;
  return {
    south: cfg.lat - delta.lat,
    north: cfg.lat + delta.lat,
    west: cfg.lng - delta.lng,
    east: cfg.lng + delta.lng,
  };
}

export function bboxPolygon(
  west: number,
  south: number,
  east: number,
  north: number
): Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

export function hash32(input: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
}

function cellHalfFromCityBbox(
  cityBbox: { south: number; north: number; west: number; east: number },
  count: number
): { lat: number; lng: number } {
  const latSpan = (cityBbox.north - cityBbox.south) * 0.84;
  const lngSpan = (cityBbox.east - cityBbox.west) * 0.84;
  const grid = Math.ceil(Math.sqrt(Math.max(count, 1)));
  return {
    lat: (latSpan / grid) * 0.38,
    lng: (lngSpan / grid) * 0.38,
  };
}

export function polygonFromCatalogNeighborhood(
  n: {
    centroid?: { lat: number; lng: number };
    bbox?: { south: number; north: number; west: number; east: number };
    geoSource?: NeighborhoodGeoSource;
  },
  fallback: {
    cityBbox: { south: number; north: number; west: number; east: number };
    index: number;
    count: number;
    seed: string;
  }
): { geometry: Polygon; geoSource: NeighborhoodGeoSource } {
  if (n.bbox) {
    const { west, south, east, north } = n.bbox;
    return {
      geometry: bboxPolygon(west, south, east, north),
      geoSource: n.geoSource === 'osm' ? 'osm' : 'divar',
    };
  }

  if (n.centroid) {
    const half = cellHalfFromCityBbox(fallback.cityBbox, fallback.count);
    const { lat, lng } = n.centroid;
    return {
      geometry: bboxPolygon(
        lng - half.lng,
        lat - half.lat,
        lng + half.lng,
        lat + half.lat
      ),
      geoSource: n.geoSource === 'osm' ? 'osm' : 'divar',
    };
  }

  return {
    geometry: syntheticNeighborhoodPolygon(fallback),
    geoSource: 'synthetic',
  };
}

/** Golden-angle grid cell polygon inside city bbox for a neighborhood index. */
export function syntheticNeighborhoodPolygon(opts: {
  cityBbox: { south: number; north: number; west: number; east: number };
  index: number;
  count: number;
  seed: string;
}): Polygon {
  const { cityBbox, index, count, seed } = opts;
  const margin = 0.08;
  const latSpan = (cityBbox.north - cityBbox.south) * (1 - 2 * margin);
  const lngSpan = (cityBbox.east - cityBbox.west) * (1 - 2 * margin);
  const centerLat = (cityBbox.north + cityBbox.south) / 2;
  const centerLng = (cityBbox.east + cityBbox.west) / 2;

  const golden = 2.399_963_229_728_653;
  const t = (index + 0.5) / Math.max(count, 1);
  const angle = index * golden;
  const radius = Math.sqrt(t) * 0.38;

  const cellLat = centerLat + Math.sin(angle) * radius * latSpan;
  const cellLng = centerLng + Math.cos(angle) * radius * lngSpan;

  const jitter = hash32(seed);
  const cellLatJ =
    cellLat + (((jitter % 200) - 100) / 100) * latSpan * 0.015;
  const cellLngJ =
    cellLng + ((((jitter >> 8) % 200) - 100) / 100) * lngSpan * 0.015;

  const cellLatHalf = (latSpan / Math.ceil(Math.sqrt(count))) * 0.42;
  const cellLngHalf = (lngSpan / Math.ceil(Math.sqrt(count))) * 0.42;

  const south = Math.max(cityBbox.south, cellLatJ - cellLatHalf);
  const north = Math.min(cityBbox.north, cellLatJ + cellLatHalf);
  const west = Math.max(cityBbox.west, cellLngJ - cellLngHalf);
  const east = Math.min(cityBbox.east, cellLngJ + cellLngHalf);

  return bboxPolygon(west, south, east, north);
}

export function makeGeoFeature(
  id: string,
  name: string,
  geometry: Polygon,
  geoSource: NeighborhoodGeoSource
): Feature<Polygon, NeighborhoodGeoProperties> {
  return {
    type: 'Feature',
    properties: { id, name, geoSource },
    geometry,
  };
}

export async function ensureGeoDirs(): Promise<void> {
  await fs.mkdir(GEO_DIR, { recursive: true });
  await fs.mkdir(GEO_CACHE_DIR, { recursive: true });
}

export { isCorruptedAreaLabel, sanitizeAreaLabels } from '../../src/lib/neighborhoods/area-labels';

/** Fallback sub-area labels when Divar/OSM provide fewer than 3 streets. */
export function fallbackAreas(name: string): string[] {
  const trimmed = name.trim();
  return [
    `${trimmed} \u0645\u0631\u06a9\u0632\u06cc`,
    `\u0634\u0645\u0627\u0644 ${trimmed}`,
    `\u062c\u0646\u0648\u0628 ${trimmed}`,
    `\u0634\u0631\u0642 ${trimmed}`,
  ];
}

export function extraFallbackAreas(name: string): string[] {
  return [
    `\u0628\u0644\u0648\u0627\u0631 ${name}`,
    `\u0645\u06cc\u062f\u0627\u0646 ${name}`,
    `\u062e\u06cc\u0627\u0628\u0627\u0646 \u0627\u0635\u0644\u06cc ${name}`,
  ];
}
