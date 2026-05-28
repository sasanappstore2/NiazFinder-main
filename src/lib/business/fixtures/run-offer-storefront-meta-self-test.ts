/**
 * Run: npx --yes tsx src/lib/business/fixtures/run-offer-storefront-meta-self-test.ts
 */
import {
  parseOfferStorefrontFromFeatures,
  serializeOfferStorefrontFeatures,
  offerMatchesCategoryFilter,
} from '../offer-storefront-meta';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

const legacy = parseOfferStorefrontFromFeatures(['__vitrineCategoryId:cat-1', 'ویژگی']);
assert(legacy.meta.categoryIds[0] === 'cat-1', 'legacy category');
assert(legacy.displayFeatures[0] === 'ویژگی', 'legacy display');

const serialized = serializeOfferStorefrontFeatures(['a'], {
  categoryIds: ['c1', 'c2'],
  primaryCategoryId: 'c2',
  variants: [{ id: 'v1', name: 'قرمز', price: '100' }],
});
const round = parseOfferStorefrontFromFeatures(serialized);
assert(round.meta.categoryIds.length === 2, 'roundtrip categories');
assert(round.meta.primaryCategoryId === 'c2', 'roundtrip primary');
assert(round.meta.variants[0]?.name === 'قرمز', 'roundtrip variant');

assert(
  offerMatchesCategoryFilter(
    { categoryIds: ['c1', 'c2'], primaryCategoryId: 'c1' },
    'c2'
  ),
  'filter multi category'
);

if (failed > 0) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('OK: offer storefront meta self-test');
