/**
 * Import city centroids — GeoNames IR cities + province capital fallback.
 * Usage: npx tsx scripts/geo/import-city-centroids.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { GEO_DIR, RAW_DIR, ensureDir, loadAdminProvinces, readJson, writeJson } from './shared';

const GEONAMES_URL = 'https://download.geonames.org/export/dump/IR.zip';

type CityCentroid = {
  cityId: string;
  provinceId: string;
  name: string;
  lat: number;
  lng: number;
  source: 'geonames' | 'province-centroid' | 'offset';
};

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/‌/g, '');
}

async function loadGeonamesCities(): Promise<Map<string, { lat: number; lng: number }>> {
  const cache = path.join(RAW_DIR, 'IR.txt');
  const map = new Map<string, { lat: number; lng: number }>();

  if (!fs.existsSync(cache)) {
    console.log('GeoNames IR.txt not cached — using province-relative offsets');
    return map;
  }

  const lines = fs.readFileSync(cache, 'utf8').split('\n');
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const cols = line.split('\t');
    const name = cols[1];
    const lat = parseFloat(cols[4]!);
    const lng = parseFloat(cols[5]!);
    const feature = cols[7];
    if (!name || !feature?.includes('P')) continue;
    map.set(norm(name), { lat, lng });
    const ascii = cols[2];
    if (ascii) map.set(norm(ascii), { lat, lng });
  }
  return map;
}

async function main() {
  ensureDir(RAW_DIR);
  const geonames = await loadGeonamesCities();
  const provinces = loadAdminProvinces();
  const provinceMeta = readJson<{ provinces: Array<{ id: string; bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number } }> }>(
    path.join(GEO_DIR, 'iran-provinces-meta.json')
  ).provinces;
  const provinceCentroids = readJson<GeoJSON.FeatureCollection>(
    path.join(GEO_DIR, 'iran-provinces.json')
  );

  const cities: CityCentroid[] = [];
  const missing: string[] = [];

  for (const province of provinces) {
    const meta = provinceMeta.find((p) => p.id === province.id);
    const pt = provinceCentroids.features.find((f) => f.properties?.id === province.id);
    const [pLon, pLat] = pt?.geometry.type === 'Point' ? pt.geometry.coordinates : [51.4, 35.7];

    province.cities.forEach((city, idx) => {
      let lat = pLat;
      let lng = pLon;
      let source: CityCentroid['source'] = 'province-centroid';

      const gn = geonames.get(norm(city.name)) ?? geonames.get(norm(city.nameEn ?? ''));
      if (gn) {
        lat = gn.lat;
        lng = gn.lng;
        source = 'geonames';
      } else if (meta) {
        // Deterministic offset within province bbox
        const hash = city.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const t1 = (hash % 100) / 100;
        const t2 = ((hash * 7) % 100) / 100;
        lng = meta.bbox.minLon + (meta.bbox.maxLon - meta.bbox.minLon) * t1;
        lat = meta.bbox.minLat + (meta.bbox.maxLat - meta.bbox.minLat) * t2;
        source = 'offset';
        missing.push(city.id);
      }

      cities.push({
        cityId: city.id,
        provinceId: province.id,
        name: city.name,
        lat,
        lng,
        source,
      });
    });
  }

  writeJson(path.join(GEO_DIR, 'iran-cities-centroids.json'), { cities, generatedAt: new Date().toISOString() });
  console.log(`Wrote ${cities.length} city centroids (${missing.length} used offset fallback)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
