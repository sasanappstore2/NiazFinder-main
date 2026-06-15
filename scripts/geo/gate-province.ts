/**
 * Province geo gate — repair (optional) + quality check + report.
 * Run: npm run geo:gate-province -- --province=tehran
 *      npm run geo:gate-province -- --province=tehran --repair
 *      npm run geo:gate-all-provinces -- --repair
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadAdminProvinces, ROOT } from './shared';
import { parseGeoArgs } from './geo-args';
import { checkProvinceGeoQuality } from './geo-quality-gate';
import { repairProvinceGeo } from './geo-city-repair';

const ROLLOUT_ORDER = [
  'tehran',
  'khorasan-razavi',
  'isfahan',
  'fars',
  'east-azerbaijan',
  'khuzestan',
  'mazandaran',
  'alborz',
  'west-azerbaijan',
  'kerman',
  'gilan',
  'sistan-baluchestan',
  'hormozgan',
  'kermanshah',
  'lorestan',
  'hamedan',
  'markazi',
  'qom',
  'golestan',
  'ardabil',
  'yazd',
  'zanjan',
  'qazvin',
  'kurdistan',
  'north-khorasan',
  'south-khorasan',
  'chaharmahal-bakhtiari',
  'bushehr',
  'semnan',
  'ilam',
  'kohgiluyeh-boyer-ahmad',
];


function resolveProvinceOrder(requested?: string): string[] {
  if (requested) return [requested];
  const provinces = loadAdminProvinces();
  const ids = new Set(provinces.map((p) => p.id));
  const ordered = ROLLOUT_ORDER.filter((id) => ids.has(id));
  for (const p of provinces) {
    if (!ordered.includes(p.id)) ordered.push(p.id);
  }
  return ordered;
}

async function gateOneProvince(
  provinceId: string,
  opts: { dryRun?: boolean; repair?: boolean; skipNetwork?: boolean }
): Promise<boolean> {
  const provinces = loadAdminProvinces();
  const meta = provinces.find((p) => p.id === provinceId);
  const name = meta?.name ?? provinceId;

  console.log(`\n######## ${name} (${provinceId}) ########`);

  if (opts.dryRun) {
    const report = await checkProvinceGeoQuality(provinceId);
    console.log(
      `Dry-run: ${report.pass ? 'would PASS' : 'would FAIL'} — ${report.errors} errors, ${report.warnings} warnings across ${report.cities.length} cities`
    );
    const gatesDir = path.join(ROOT, 'reports/geo-gates');
    fs.mkdirSync(gatesDir, { recursive: true });
    fs.writeFileSync(
      path.join(gatesDir, `${provinceId}.json`),
      JSON.stringify(report, null, 2) + '\n',
      'utf8'
    );
    return report.pass;
  }

  if (opts.repair) {
    await repairProvinceGeo(provinceId, { skipNetwork: opts.skipNetwork });
  }

  const report = await checkProvinceGeoQuality(provinceId);
  const gatesDir = path.join(ROOT, 'reports/geo-gates');
  fs.mkdirSync(gatesDir, { recursive: true });
  const outPath = path.join(gatesDir, `${provinceId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(
    `${report.pass ? 'PASS' : 'FAIL'} — ${report.errors} errors, ${report.warnings} warnings → ${outPath}`
  );

  if (!report.pass) {
    for (const city of report.cities.filter((c) => !c.pass)) {
      for (const issue of city.issues.filter((i) => i.level === 'error').slice(0, 5)) {
        console.error(`  [${city.cityId}] ${issue.code}: ${issue.message}`);
      }
    }
  }

  return report.pass;
}

async function main(): Promise<void> {
  const args = parseGeoArgs(process.argv.slice(2));
  const isAll = args.all === true;
  const provinceIds = resolveProvinceOrder(isAll ? undefined : args.province);

  if (!isAll && !args.province) {
    console.error('Usage: --province=<id> or --all');
    process.exit(1);
  }

  const skipNetwork = process.env.GEO_SKIP_NETWORK === '1';
  let failed = 0;

  for (const provinceId of provinceIds) {
    const ok = await gateOneProvince(provinceId, {
      dryRun: args.dryRun,
      repair: args.repair,
      skipNetwork,
    });
    if (!ok) {
      failed += 1;
      if (!isAll) break;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} province(s) failed geo gate.`);
    process.exit(1);
  }
  console.log('\nAll province geo gates passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
