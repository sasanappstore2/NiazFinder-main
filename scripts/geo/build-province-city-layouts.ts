/**
 * Build per-province city honeycomb layouts (lazy-load JSON files).
 */
import path from 'node:path';
import { GEO_DIR, PROVINCES_DIR, ensureDir, loadAdminProvinces, readJson, writeJson } from './shared';

const PROVINCE_VIEW = { width: 600, height: 400 };

function lonLatToLocal(lon: number, lat: number, bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number }) {
  const x = ((lon - bbox.minLon) / (bbox.maxLon - bbox.minLon || 1)) * PROVINCE_VIEW.width;
  const y = ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat || 1)) * PROVINCE_VIEW.height;
  return { x, y };
}

function hexPath(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${i === 0 ? 'M' : 'L'} ${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ') + ' Z';
}

async function main() {
  ensureDir(PROVINCES_DIR);
  const provinces = loadAdminProvinces();
  const cityCentroids = readJson<{ cities: Array<{ cityId: string; provinceId: string; name: string; lat: number; lng: number }> }>(
    path.join(GEO_DIR, 'iran-cities-centroids.json')
  ).cities;
  const paths = readJson<{ features: Array<{ id: string; path: string }> }>(
    path.join(GEO_DIR, 'iran-provinces-paths.json')
  );
  const meta = readJson<{ provinces: Array<{ id: string; bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number } }> }>(
    path.join(GEO_DIR, 'iran-provinces-meta.json')
  ).provinces;

  for (const province of provinces) {
    const bbox = meta.find((m) => m.id === province.id)?.bbox ?? {
      minLon: 44, maxLon: 63, minLat: 25, maxLat: 40,
    };
    const citiesInProvince = cityCentroids.filter((c) => c.provinceId === province.id);
    const count = citiesInProvince.length;
    const radius = Math.max(8, Math.min(14, 120 / Math.sqrt(count || 1)));

    const cities = citiesInProvince.map((c) => {
      const { x: cx, y: cy } = lonLatToLocal(c.lng, c.lat, bbox);
      return {
        id: c.cityId,
        name: c.name,
        cx,
        cy,
        radius,
        hexPath: hexPath(cx, cy, radius),
        lon: c.lng,
        lat: c.lat,
      };
    });

    const boundaryPath = paths.features.find((p) => p.id === province.id)?.path ?? '';

    writeJson(path.join(PROVINCES_DIR, `${province.id}-cities-hex.json`), {
      provinceId: province.id,
      viewBox: PROVINCE_VIEW,
      boundaryPath,
      cities,
    });
  }

  console.log(`Built city layouts for ${provinces.length} provinces`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
