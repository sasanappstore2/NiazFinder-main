import assert from 'node:assert/strict';
import { extractNeighborhoodSlugFromDynamicAnswers } from '@/lib/need/extract-neighborhood-slug';
import {
  persianCityNameToSlug,
  resolveApproximateNeighborhoodPin,
} from '@/lib/need/approximate-neighborhood-pin';

const MASHHAD = '\u0645\u0634\u0647\u062f';
const ABKOOH = '\u0622\u0628\u06a9\u0648\u0647';
const SHAHID_SLUG = '\u0634\u0647\u06cc\u062f-\u0641\u0631\u0627\u0645\u0631\u0632-\u0639\u0628\u0627\u0633\u06cc';

function testExtractSlug() {
  const json = JSON.stringify({
    _neighborhoodSlug: SHAHID_SLUG,
    entities: { neighborhoodSlug: 'ignored-if-direct' },
  });
  assert.equal(extractNeighborhoodSlugFromDynamicAnswers(json), SHAHID_SLUG);

  const entitiesOnly = JSON.stringify({
    entities: { neighborhoodSlug: ABKOOH },
  });
  assert.equal(extractNeighborhoodSlugFromDynamicAnswers(entitiesOnly), ABKOOH);
}

function testApproximatePinStable() {
  assert.equal(persianCityNameToSlug(MASHHAD), 'mashhad');

  const a = resolveApproximateNeighborhoodPin({
    citySlug: 'mashhad',
    neighborhoodSlug: ABKOOH,
    neighborhoodOrder: 12,
    neighborhoodCount: 200,
    seed: 'req-a',
  });
  const b = resolveApproximateNeighborhoodPin({
    citySlug: 'mashhad',
    neighborhoodSlug: ABKOOH,
    neighborhoodOrder: 12,
    neighborhoodCount: 200,
    seed: 'req-a',
  });
  const c = resolveApproximateNeighborhoodPin({
    citySlug: 'mashhad',
    neighborhoodSlug: ABKOOH,
    neighborhoodOrder: 12,
    neighborhoodCount: 200,
    seed: 'req-b',
  });

  assert.ok(a && b);
  assert.equal(a!.lat, b!.lat);
  assert.equal(a!.lng, b!.lng);
  assert.ok(c);
  assert.notEqual(a!.lat, c!.lat);
}

testExtractSlug();
testApproximatePinStable();

console.log('[ok] approximate need map pin self-test');
