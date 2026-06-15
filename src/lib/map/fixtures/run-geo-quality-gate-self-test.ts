/**
 * Self-test for geo quality gate.
 * Run: npm run test:geo-quality-gate
 */
import { checkCityGeoQuality } from '../../../../scripts/geo/geo-quality-gate';
import { loadAdminCities } from '../../../../scripts/neighborhoods/lib';
import { loadTierConfig, resolveCityTier } from '../../../../scripts/geo/tier-config';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  const cfg = loadTierConfig();
  assert(cfg.tierA.includes('tehran-city'), 'tehran-city in tier A');
  assert(cfg.tierA.includes('mashhad'), 'mashhad in tier A');
  assert(resolveCityTier('tehran-city', true) === 'A', 'tehran tier A');
  assert(resolveCityTier('unknown-small-city', false) === 'C', 'unknown tier C');

  const admin = await loadAdminCities();
  const mashhad = admin.find((c) => c.id === 'mashhad');
  const tehran = admin.find((c) => c.id === 'tehran-city');
  assert(mashhad != null, 'mashhad in admin');
  assert(tehran != null, 'tehran-city in admin');

  const divarMapped = new Set(['mashhad', 'tehran-city', 'isfahan', 'shiraz']);

  const mashhadReport = await checkCityGeoQuality(mashhad!, divarMapped);
  assert(mashhadReport.neighborhoodCount >= 250, `mashhad hoods >= 250, got ${mashhadReport.neighborhoodCount}`);
  assert(
    !mashhadReport.issues.some((i) => i.code === 'missing_catalog'),
    'mashhad has catalog'
  );

  const tehranReport = await checkCityGeoQuality(tehran!, divarMapped);
  assert(tehranReport.neighborhoodCount >= 350, `tehran hoods >= 350, got ${tehranReport.neighborhoodCount}`);

  console.log(
    JSON.stringify({
      ok: true,
      mashhad: { pass: mashhadReport.pass, hoods: mashhadReport.neighborhoodCount, tier: mashhadReport.tier },
      tehran: { pass: tehranReport.pass, hoods: tehranReport.neighborhoodCount, tier: tehranReport.tier },
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
