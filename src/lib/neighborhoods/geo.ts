import { promises as fs } from 'fs';
import path from 'path';
import type { Feature, Polygon } from 'geojson';
import {
  resolveCatalogCityIdCandidates,
  type CatalogNeighborhood,
} from '@/lib/neighborhoods/catalog';
import { bboxFromPolygonFeature, centroidFromBbox } from '@/lib/neighborhoods/geo-geometry';
import type {
  CityNeighborhoodGeoCollection,
  NeighborhoodGeoManifest,
  NeighborhoodGeoProperties,
} from '@/lib/neighborhoods/geo-types';

const NEIGHBORHOODS_ROOT = path.join(process.cwd(), 'src', 'data', 'neighborhoods');
const GEO_DIR = path.join(NEIGHBORHOODS_ROOT, 'geo');
const GEO_MANIFEST_PATH = path.join(NEIGHBORHOODS_ROOT, 'geo-manifest.json');

let geoManifestCache: NeighborhoodGeoManifest | null = null;

export function geoFilePath(cityId: string): string {
  return path.join(GEO_DIR, `${cityId}.geojson`);
}

export async function readGeoManifest(): Promise<NeighborhoodGeoManifest> {
  if (geoManifestCache) return geoManifestCache;
  try {
    const raw = await fs.readFile(GEO_MANIFEST_PATH, 'utf8');
    geoManifestCache = JSON.parse(raw) as NeighborhoodGeoManifest;
    return geoManifestCache;
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      cities: {},
      totalFeatures: 0,
    };
  }
}

export async function writeGeoManifest(manifest: NeighborhoodGeoManifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  await fs.mkdir(NEIGHBORHOODS_ROOT, { recursive: true });
  await fs.writeFile(GEO_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  geoManifestCache = manifest;
}

export async function loadCityGeoFile(cityId: string): Promise<CityNeighborhoodGeoCollection | null> {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    try {
      const raw = await fs.readFile(geoFilePath(candidate), 'utf8');
      return JSON.parse(raw) as CityNeighborhoodGeoCollection;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

export async function saveCityGeoFile(
  cityId: string,
  collection: CityNeighborhoodGeoCollection
): Promise<void> {
  await fs.mkdir(GEO_DIR, { recursive: true });
  await fs.writeFile(geoFilePath(cityId), JSON.stringify(collection, null, 2), 'utf8');
  geoManifestCache = null;
}

export { bboxFromPolygonFeature, centroidFromBbox } from '@/lib/neighborhoods/geo-geometry';

export async function loadNeighborhoodGeoFeatures(
  cityId: string,
  neighborhoodIds?: string[]
): Promise<Feature<Polygon, NeighborhoodGeoProperties>[]> {
  const geo = await loadCityGeoFile(cityId);
  if (!geo?.features?.length) return [];

  if (!neighborhoodIds?.length) return geo.features;

  const wanted = new Set(neighborhoodIds);
  return geo.features.filter((f) => wanted.has(f.properties.id));
}

export function syncCatalogGeoFields(
  neighborhoods: CatalogNeighborhood[],
  features: Feature<Polygon, NeighborhoodGeoProperties>[]
): CatalogNeighborhood[] {
  const byId = new Map(features.map((f) => [f.properties.id, f]));
  return neighborhoods.map((n) => {
    const feature = byId.get(n.id);
    if (!feature) return n;
    const bbox = bboxFromPolygonFeature(feature);
    const centroid = centroidFromBbox(bbox);
    return {
      ...n,
      centroid,
      bbox,
      geoSource: feature.properties.geoSource,
    };
  });
}
