/**
 * Run: npx --yes tsx src/lib/business/fixtures/run-site-import-sanitize-self-test.ts
 */
import { sanitizeSiteImportSuggestion } from '../site-import/sanitize-suggestions';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

const valid = sanitizeSiteImportSuggestion({
  id: 'x1',
  group: 'brand',
  labelFa: 'توضیحات',
  preview: { description: 'test' },
  apply: { type: 'patch_profile', payload: { description: 'hello', evil: 'drop me' } },
});

assert(valid?.apply.payload.evil === undefined, 'strips unknown profile keys');
assert(valid?.apply.payload.description === 'hello', 'keeps description');

const junk = sanitizeSiteImportSuggestion({
  id: 'x2',
  group: 'brand',
  labelFa: 'x',
  preview: {},
  apply: { type: 'add_offers', payload: { offers: [{ title: '' }] } },
});
assert(junk === null, 'rejects empty offers');

const cats = sanitizeSiteImportSuggestion({
  id: 'x3',
  group: 'storefront_categories',
  labelFa: 'دسته‌ها',
  preview: {},
  apply: { type: 'add_categories', payload: { titles: ['الف', 'الف', 'ب'] } },
});
assert(cats?.apply.payload.titles?.length === 2, 'dedupes categories');

if (failed === 0) {
  console.log('OK: site-import sanitize self-test passed');
} else {
  process.exit(1);
}
