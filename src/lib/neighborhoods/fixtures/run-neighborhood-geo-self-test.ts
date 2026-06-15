import assert from 'node:assert/strict';
import {
  loadCityCatalogFile,
  resolveCatalogCityIdCandidates,
} from '@/lib/neighborhoods/catalog';
import { displayAreaLabels } from '@/lib/neighborhoods/area-labels';
import { loadCityGeoFile, readGeoManifest } from '@/lib/neighborhoods/geo';

const MASHHAD_AZAD_NAME = '\u0622\u0632\u0627\u062f\u0634\u0647\u0631';
const AREA_MADRAS = '\u0645\u062f\u0631\u0633';
const AREA_VAKILABAD = '\u0648\u06a9\u06cc\u0644 \u0622\u0628\u0627\u062f';

async function assertCity(cityId: string, minHoods: number): Promise<void> {
  const catalog =
    (await loadCityCatalogFile(cityId)) ??
    (await Promise.all(resolveCatalogCityIdCandidates(cityId).map(loadCityCatalogFile))).find(Boolean);

  assert.ok(catalog, `missing catalog for ${cityId}`);
  assert.ok(
    catalog!.neighborhoods.length >= minHoods,
    `${cityId}: expected >= ${minHoods} hoods`
  );

  for (const hood of catalog!.neighborhoods) {
    const areas = displayAreaLabels(hood.areas, hood.name);
    const hasGeo = Boolean(hood.bbox || hood.centroid);
    assert.ok(
      areas.length > 0 || hasGeo,
      `${cityId}/${hood.id}: expected real areas or geo`
    );
  }

  const geo = await loadCityGeoFile(cityId);
  assert.ok(geo?.features?.length, `${cityId}: missing geo features`);
  assert.equal(geo!.features.length, catalog!.neighborhoods.length);
}

async function run(): Promise<void> {
  const manifest = await readGeoManifest();
  assert.ok(manifest.totalFeatures >= 10_000, 'geo manifest too small');

  await assertCity('mashhad', 250);
  await assertCity('tehran-city', 350);

  const mashhad = await loadCityCatalogFile('mashhad');
  const azad = mashhad?.neighborhoods.find(
    (n) => n.id === MASHHAD_AZAD_NAME || n.name === MASHHAD_AZAD_NAME
  );
  assert.ok(azad, 'mashhad azadshahr missing');
  assert.ok((azad!.areas ?? []).some((a) => a.includes(AREA_MADRAS)));
  assert.ok((azad!.areas ?? []).some((a) => a.includes(AREA_VAKILABAD)));

  console.log('[ok] neighborhood geo self-test');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
