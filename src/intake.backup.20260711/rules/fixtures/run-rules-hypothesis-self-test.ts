/**
 * Unit self-test for isCategoryAmbiguous / pickCategoryIfClear thresholds.
 *
 * Run: npm run test:rules-hypothesis
 */
import {
  isCategoryAmbiguous,
  pickCategoryIfClear,
} from '@/intake/rules/registry-match';
import type { CategoryMatchCandidate } from '@/intake/rules/types';

function candidate(
  slug: string,
  confidence: number,
  score: number
): CategoryMatchCandidate {
  return {
    slug,
    confidence,
    score,
    matchedRules: ['test-rule'],
  };
}

function assert(name: string, cond: boolean): void {
  if (!cond) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  console.log(`ok ${name}`);
}

function main(): void {
  const clearWinners = [
    candidate('refrigerator', 0.95, 100),
    candidate('washing-machine', 0.7, 50),
  ];
  assert('clear winner not ambiguous', !isCategoryAmbiguous(clearWinners));
  assert(
    'clear winner picked',
    pickCategoryIfClear('test', clearWinners, [])?.categorySlug === 'refrigerator' ||
      pickCategoryIfClear('test', clearWinners, [])?.subcategorySlug === 'refrigerator'
  );

  const tiedTop = [
    candidate('apartment-sale', 0.98, 100),
    candidate('apartment-rent', 0.98, 98),
    candidate('real-estate', 0.93, 80),
  ];
  assert('tied top is ambiguous', isCategoryAmbiguous(tiedTop));
  assert('tied top not auto-picked', pickCategoryIfClear('test', tiedTop, []) === null);

  const nearTop = [
    candidate('x', 0.8, 100),
    candidate('y', 0.78, 65),
    candidate('z', 0.5, 40),
  ];
  assert('near-top ratio ambiguous', isCategoryAmbiguous(nearTop));

  const single = [candidate('only', 0.99, 100)];
  assert('single candidate not ambiguous', !isCategoryAmbiguous(single));

  console.log('test:rules-hypothesis OK');
}

main();
