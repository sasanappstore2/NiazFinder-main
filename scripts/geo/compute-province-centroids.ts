/**
 * Compute province centroids and bbox from boundaries GeoJSON.
 */
import path from 'node:path';
import * as turf from '@turf/turf';
import { GEO_DIR, loadAdminProvinces, readJson, writeJson } from './shared';

async function main() {
  const boundaries = readJson<GeoJSON.FeatureCollection>(
    path.join(GEO_DIR, 'iran-provinces-boundaries.geojson')
  );
  const admin = loadAdminProvinces();

  const features = boundaries.features.map((f) => {
    const id = f.properties?.id as string;
    const adminP = admin.find((p) => p.id === id);
    const centroid = turf.centroid(f);
    const [lon, lat] = centroid.geometry.coordinates;
    const bbox = turf.bbox(f);
    return {
      type: 'Feature' as const,
      properties: { id, name: adminP?.name ?? id, nameEn: adminP?.nameEn },
      geometry: { type: 'Point' as const, coordinates: [lon, lat] as [number, number] },
      bbox: { minLon: bbox[0], minLat: bbox[1], maxLon: bbox[2], maxLat: bbox[3] },
    };
  });

  writeJson(path.join(GEO_DIR, 'iran-provinces-meta.json'), { provinces: features.map(({ properties, bbox }) => ({ ...properties, bbox })) });

  writeJson(path.join(GEO_DIR, 'iran-provinces.json'), {
    type: 'FeatureCollection',
    features: features.map(({ type, properties, geometry }) => ({ type, properties, geometry })),
  });

  console.log(`Computed centroids for ${features.length} provinces`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
