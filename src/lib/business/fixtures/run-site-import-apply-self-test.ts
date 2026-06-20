/**
 * Run: npx --yes tsx src/lib/business/fixtures/run-site-import-apply-self-test.ts
 */
import {
  isValidSiteImportSuggestion,
  sortAcceptedSuggestions,
} from '../site-import/suggestion-queue';
import type { SiteImportSuggestion } from '../site-import/types';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

const suggestions: SiteImportSuggestion[] = [
  {
    id: 'offers-1',
    group: 'products',
    labelFa: 'محصولات',
    preview: { products: [{ title: 'کفش' }] },
    apply: {
      type: 'add_offers',
      payload: { offers: [{ title: 'کفش', description: 'کفش ورزشی' }] },
    },
  },
  {
    id: 'brand-1',
    group: 'brand',
    labelFa: 'توضیحات',
    preview: { description: 'درباره ما' },
    apply: { type: 'patch_profile', payload: { description: 'درباره ما' } },
  },
  {
    id: 'cats-1',
    group: 'storefront_categories',
    labelFa: 'دسته‌ها',
    preview: { categories: ['کفش', 'لباس'] },
    apply: { type: 'add_categories', payload: { titles: ['کفش', 'لباس'] } },
  },
  {
    id: 'social-1',
    group: 'social',
    labelFa: 'اینستاگرام',
    preview: { instagram: 'https://instagram.com/shop' },
    apply: {
      type: 'patch_web_presence',
      payload: { instagram: 'https://instagram.com/shop' },
    },
  },
];

for (const s of suggestions) {
  assert(isValidSiteImportSuggestion(s), `valid shape: ${s.id}`);
}

assert(isValidSiteImportSuggestion({ id: 'x' }) === false, 'invalid shape rejected');

const ordered = sortAcceptedSuggestions(suggestions, [
  'offers-1',
  'brand-1',
  'cats-1',
  'social-1',
]);

assert(ordered[0]?.id === 'brand-1', 'profile patch first');
assert(ordered[1]?.id === 'social-1', 'web presence second');
assert(ordered[2]?.id === 'cats-1', 'categories before offers');
assert(ordered[3]?.id === 'offers-1', 'offers last');

const filtered = sortAcceptedSuggestions(suggestions, ['brand-1', 'offers-1']);
assert(filtered.length === 2, 'filters accepted only');
assert(filtered[0]?.id === 'brand-1', 'filtered order respects apply order');

if (failed === 0) {
  console.log('OK: site-import apply self-test passed');
} else {
  process.exit(1);
}
