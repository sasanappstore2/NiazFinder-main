/**
 * Publish readiness: city + neighborhood auto-seed map pin and title.
 *
 * Run: npm run test:publish-readiness
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  projectNeedDraftFromForm,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { getPublishReadiness } from '@/intake/validation/publishValidator';
import { ensureDraftMapPin } from '@/lib/need/ensure-draft-map-pin';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import { recordToEntities } from '@/intake/entities/entityRecord';

async function stubServerOnly(): Promise<void> {
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: {},
  } as NodeModule;
}

async function main(): Promise<void> {
  await stubServerOnly();

  const projected = projectNeedDraftFromForm(null, {
    needText: 'آپارتمان دو خواب اجاره در مشهد محله سجاد رهن ۵۰۰ اجاره ۱۵',
    detailsText: '',
    categorySlug: 'real-estate',
    subcategorySlug: 'apartment-rent',
    city: 'مشهد',
    neighborhood: 'سجاد',
    neighborhoodSlug: null,
  });
  const withPin = ensureDraftMapPin(recomputeNeedDraft(projected), 'سجاد-مشهد');
  const entities = recordToEntities(withPin.entities);

  assert.ok(entities.city?.includes('مشهد'), `city missing: ${entities.city}`);
  assert.ok(entities.neighborhood?.includes('سجاد'), `neighborhood missing: ${entities.neighborhood}`);
  assert.ok(entities.lat != null && entities.lng != null, 'map pin must be auto-seeded');
  assert.ok(entities.transactionType, `transactionType missing: ${entities.transactionType}`);

  const readiness = getPublishReadiness(withPin);
  assert.equal(
    readiness.canPublish,
    true,
    `expected canPublish, errors=${JSON.stringify(readiness.errors)}`
  );

  const title = resolveDeterministicListingTitle(withPin).title.trim();
  assert.ok(title.length > 0, 'deterministic title must be non-empty');
  assert.notEqual(title, 'ثبت نیاز');

  const noPin = projectNeedDraftFromForm(null, {
    needText: 'آپارتمان اجاره',
    detailsText: '',
    categorySlug: 'real-estate',
    subcategorySlug: 'apartment-rent',
    city: '',
    neighborhood: '',
    neighborhoodSlug: null,
  });
  const blocked = getPublishReadiness(noPin);
  assert.equal(blocked.canPublish, false, 'empty city/hood must not publish');
  assert.ok(blocked.errors.some((e) => e.field === 'city' || e.field === 'neighborhood' || e.field === 'mapPin'));

  console.log(
    JSON.stringify({
      ok: true,
      lat: entities.lat,
      lng: entities.lng,
      title,
      errors: readiness.errors,
    })
  );
  console.log('test:publish-readiness OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
