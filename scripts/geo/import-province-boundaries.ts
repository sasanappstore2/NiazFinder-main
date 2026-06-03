/**
 * Download Iran ADM1 boundaries from geoBoundaries, simplify, map slugs.
 * Usage: npx tsx scripts/geo/import-province-boundaries.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';
import {
  GEO_DIR,
  RAW_DIR,
  ensureDir,
  loadAdminProvinces,
  writeJson,
  readJson,
} from './shared';

const GEOBOUNDARIES_URL =
  'https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/IRN/ADM1/geoBoundaries-IRN-ADM1.geojson';

async function main() {
  ensureDir(RAW_DIR);
  const rawPath = path.join(RAW_DIR, 'geoBoundaries-IRN-ADM1.geojson');

  let raw: GeoJSON.FeatureCollection;
  if (fs.existsSync(rawPath)) {
    console.log('Using cached raw GeoJSON');
    raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  } else {
    console.log('Downloading geoBoundaries IRN ADM1...');
    const res = await fetch(GEOBOUNDARIES_URL);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    raw = (await res.json()) as GeoJSON.FeatureCollection;
    fs.writeFileSync(rawPath, JSON.stringify(raw));
  }

  const slugMap = readJson<{ geoBoundariesNameToSlug: Record<string, string> }>(
    `${GEO_DIR}/province-slug-map.json`
  ).geoBoundariesNameToSlug;

  const adminProvinces = loadAdminProvinces();
  const adminIds = new Set(adminProvinces.map((p) => p.id));

  const features: GeoJSON.Feature[] = [];
  const seen = new Set<string>();

  for (const feature of raw.features) {
    const props = feature.properties ?? {};
    const name =
      (props.shapeName as string) ??
      (props.name as string) ??
      (props.NAME_1 as string) ??
      '';
    const slug = slugMap[name];
    if (!slug) {
      console.warn('Unmapped province:', name, props);
      continue;
    }
    if (seen.has(slug)) continue;
    seen.add(slug);

    let geom = feature.geometry;
    if (geom.type === 'MultiPolygon' || geom.type === 'Polygon') {
      const simplified = turf.simplify(feature, { tolerance: 0.02, highQuality: true });
      features.push({
        type: 'Feature',
        properties: { id: slug, name: adminProvinces.find((p) => p.id === slug)?.name ?? name },
        geometry: simplified.geometry,
      });
    }
  }

  const missing = [...adminIds].filter((id) => !features.some((f) => f.properties?.id === id));
  if (missing.length) {
    console.warn('Missing provinces in GeoJSON, generating fallback hex polygons:', missing);
    const existing = readJson<{ features: Array<{ properties: { id: string }; geometry: { coordinates: [number, number] } }> }>(
      `${GEO_DIR}/iran-provinces.json`
    );
    for (const id of missing) {
      const pt = existing.features.find((f) => f.properties.id === id);
      if (!pt) continue;
      const [lon, lat] = pt.geometry.coordinates;
      const hex = turf.circle([lon, lat], 1.2, { steps: 6, units: 'degrees' });
      hex.properties = { id, name: adminProvinces.find((p) => p.id === id)?.name ?? id };
      features.push(hex as GeoJSON.Feature);
    }
  }

  writeJson(`${GEO_DIR}/iran-provinces-boundaries.geojson`, {
    type: 'FeatureCollection',
    features,
  });

  console.log(`Wrote ${features.length} province boundaries`);
  if (features.length !== 31) {
    console.warn(`Expected 31 provinces, got ${features.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
