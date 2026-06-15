/**
 * Every province must have at least one city with a neighborhood catalog.
 * Run: npm run test:province-geo-parity
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadAdminProvinces, ROOT } from '../../../../scripts/geo/shared';
import {
  loadCityCatalogFile,
  resolveCatalogCityIdCandidates,
} from '@/lib/neighborhoods/catalog';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function hasCatalog(cityId: string): Promise<boolean> {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const file = await loadCityCatalogFile(candidate);
    if ((file?.neighborhoods?.length ?? 0) > 0) return true;
  }
  return false;
}

async function main(): Promise<void> {
  const provinces = loadAdminProvinces();
  const failures: string[] = [];

  for (const province of provinces) {
    let any = false;
    for (const city of province.cities) {
      if (await hasCatalog(city.id)) {
        any = true;
        break;
      }
    }
    if (!any) failures.push(`${province.id} (${province.name})`);
  }

  assert(failures.length === 0, `provinces without catalog: ${failures.join(', ')}`);

  const gatesDir = path.join(ROOT, 'reports/geo-gates');
  const gateCount = fs.existsSync(gatesDir)
    ? fs.readdirSync(gatesDir).filter((f) => f.endsWith('.json')).length
    : 0;

  console.log(
    JSON.stringify({
      ok: true,
      provinces: provinces.length,
      gateReports: gateCount,
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
