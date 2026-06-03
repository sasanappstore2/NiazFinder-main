/**
 * Assert province slug parity between admin-locations and geo data.
 */
import path from 'node:path';
import { GEO_DIR, loadAdminProvinces, readJson } from './shared';

async function main() {
  const admin = loadAdminProvinces();
  const boundaries = readJson<GeoJSON.FeatureCollection>(
    path.join(GEO_DIR, 'iran-provinces-boundaries.geojson')
  );
  const geoIds = new Set(boundaries.features.map((f) => f.properties?.id as string));

  let ok = true;
  for (const p of admin) {
    if (!geoIds.has(p.id)) {
      console.error('MISSING geo boundary for admin province:', p.id);
      ok = false;
    }
  }
  for (const id of geoIds) {
    if (!admin.find((p) => p.id === id)) {
      console.error('EXTRA geo boundary not in admin:', id);
      ok = false;
    }
  }

  if (!ok) process.exit(1);
  console.log(`Slug parity OK: ${admin.length} provinces`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
