/**
 * Validate geo map data: 31 provinces, admin city parity, paths, slug parity.
 * Usage: npx tsx scripts/test-geo-map-data.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadAdminProvinces } from './geo/shared';

const GEO = path.join(process.cwd(), 'src/data/geo');

function main() {
  let ok = true;
  const admin = loadAdminProvinces();
  const adminCityCount = admin.reduce((n, p) => n + p.cities.length, 0);
  const boundaries = JSON.parse(fs.readFileSync(path.join(GEO, 'iran-provinces-boundaries.geojson'), 'utf8'));
  const centroids = JSON.parse(fs.readFileSync(path.join(GEO, 'iran-cities-centroids.json'), 'utf8'));
  const layout = JSON.parse(fs.readFileSync(path.join(GEO, 'iran-national-hex-layout.json'), 'utf8'));
  const paths = JSON.parse(fs.readFileSync(path.join(GEO, 'iran-provinces-paths.json'), 'utf8'));

  const geoIds = new Set(boundaries.features.map((f: { properties: { id: string } }) => f.properties.id));
  if (geoIds.size !== 31) {
    console.error('FAIL: expected 31 province boundaries, got', geoIds.size);
    ok = false;
  }

  for (const p of admin) {
    if (!geoIds.has(p.id)) {
      console.error('FAIL: missing boundary for', p.id);
      ok = false;
    }
    const layoutFile = path.join(GEO, 'provinces', `${p.id}-cities-hex.json`);
    if (!fs.existsSync(layoutFile)) {
      console.error('FAIL: missing city layout for', p.id);
      ok = false;
    }
  }

  if (centroids.cities.length < adminCityCount) {
    console.error(
      'FAIL: centroids',
      centroids.cities.length,
      '< admin cities',
      adminCityCount
    );
    ok = false;
  }

  if (layout.cells.length < 31) {
    console.error('FAIL: national hex layout too small');
    ok = false;
  }

  if (paths.features.length < 31) {
    console.error('FAIL: province paths too few');
    ok = false;
  }

  if (ok) {
    console.log('OK: geo map data validation passed', {
      provinces: admin.length,
      adminCities: adminCityCount,
      centroids: centroids.cities.length,
    });
  } else process.exit(1);
}

main();
