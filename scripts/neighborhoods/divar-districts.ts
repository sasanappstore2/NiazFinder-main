/**
 * Shared Divar district parsing + catalog merge helpers.
 */
import type { CatalogNeighborhood } from '../../src/lib/neighborhoods/catalog-types';
import { slugifyNeighborhoodNames } from '../../src/lib/neighborhoods/catalog';
import { sanitizeAreaLabels } from '../../src/lib/neighborhoods/area-labels';
import {
  DIVAR_DISTRICTS_URL,
  normalizePersianName,
  sleep,
  type DivarDistrict,
} from './lib';

const USEFUL_TAG_TYPES = new Set(['STREET', 'AREA', 'LANDMARK', 'POI', 'PLACE']);

export interface NeighborhoodSeed {
  name: string;
  areas?: string[];
  centroid?: { lat: number; lng: number };
  bbox?: { south: number; north: number; west: number; east: number };
  geoSource?: 'divar';
}

export interface MergeStats {
  merged: number;
  added: number;
  kept: number;
}

export function districtAreas(district: DivarDistrict): string[] | undefined {
  const areas = (district.tags ?? [])
    .filter((t) => USEFUL_TAG_TYPES.has(t.type) && t.title?.trim())
    .map((t) => t.title.trim());
  const sanitized = sanitizeAreaLabels(areas, district.name.trim());
  return sanitized.length ? sanitized : undefined;
}

export function districtGeoFromDivar(district: DivarDistrict): {
  centroid?: { lat: number; lng: number };
  bbox?: { south: number; north: number; west: number; east: number };
  geoSource?: 'divar';
} {
  const loc = district.centroid ?? district.default_location;
  const out: {
    centroid?: { lat: number; lng: number };
    bbox?: { south: number; north: number; west: number; east: number };
    geoSource?: 'divar';
  } = {};

  if (
    loc &&
    Number.isFinite(loc.latitude) &&
    Number.isFinite(loc.longitude) &&
    Math.abs(loc.latitude) <= 90 &&
    Math.abs(loc.longitude) <= 180
  ) {
    out.centroid = { lat: loc.latitude, lng: loc.longitude };
    out.geoSource = 'divar';
  }

  const raw = district.bbox;
  if (raw?.length === 4) {
    const [west, south, east, north] = raw;
    if (
      Number.isFinite(west) &&
      Number.isFinite(south) &&
      Number.isFinite(east) &&
      Number.isFinite(north) &&
      west < east &&
      south < north
    ) {
      out.bbox = { west, south, east, north };
      out.geoSource = 'divar';
    }
  }

  return out;
}

export function districtsToSeeds(districts: DivarDistrict[]): NeighborhoodSeed[] {
  return districts
    .map((d) => ({
      name: d.name.trim(),
      areas: districtAreas(d),
      ...districtGeoFromDivar(d),
    }))
    .filter((s) => s.name.length > 0);
}

export function districtsToNeighborhoods(districts: DivarDistrict[]): CatalogNeighborhood[] {
  return slugifyNeighborhoodNames(districtsToSeeds(districts));
}

function mergeAreaLists(
  divarAreas?: string[],
  existingAreas?: string[]
): string[] | undefined {
  const divar = divarAreas ?? [];
  const existing = existingAreas ?? [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const area of [...divar, ...existing]) {
    const key = normalizePersianName(area);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(area);
  }

  return out.length ? out : undefined;
}

export function mergeCatalogNeighborhoods(
  existing: CatalogNeighborhood[],
  incoming: CatalogNeighborhood[]
): { neighborhoods: CatalogNeighborhood[]; stats: MergeStats } {
  const byName = new Map<string, CatalogNeighborhood>();
  for (const hood of existing) {
    byName.set(normalizePersianName(hood.name), hood);
  }

  const stats: MergeStats = { merged: 0, added: 0, kept: 0 };
  const incomingNames = new Set<string>();

  for (const inc of incoming) {
    const key = normalizePersianName(inc.name);
    incomingNames.add(key);
    const prev = byName.get(key);

    if (prev) {
      stats.merged += 1;
      byName.set(key, {
        ...prev,
        areas: mergeAreaLists(inc.areas, prev.areas),
        centroid: prev.geoSource === 'manual' ? prev.centroid : inc.centroid ?? prev.centroid,
        bbox: prev.geoSource === 'manual' ? prev.bbox : inc.bbox ?? prev.bbox,
        geoSource: prev.geoSource === 'manual' ? 'manual' : inc.geoSource ?? prev.geoSource,
      });
    } else {
      stats.added += 1;
      byName.set(key, inc);
    }
  }

  for (const hood of existing) {
    if (!incomingNames.has(normalizePersianName(hood.name))) {
      stats.kept += 1;
    }
  }

  return {
    neighborhoods: [...byName.values()],
    stats,
  };
}

export async function fetchDistricts(divarCityId: number, retries = 3): Promise<DivarDistrict[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const res = await fetch(DIVAR_DISTRICTS_URL(divarCityId));
      if (!res.ok) throw new Error(`Districts HTTP ${res.status} for city ${divarCityId}`);
      const json = (await res.json()) as { districts?: DivarDistrict[] };
      return json.districts ?? [];
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries - 1) {
        await sleep(400 * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error(`Failed districts for city ${divarCityId}`);
}
