/**
 * Browse category filter resolver self-test.
 * Run: npx --yes tsx src/lib/business/fixtures/run-browse-category-filter-self-test.ts
 */
import {
  browseCategorySegmentKind,
  categoryFilterToPrismaWhere,
  resolveBrowseCategoryFilter,
} from '../resolve-browse-category-filter';
import { expandOccupationsForNeedMatch } from '@/config/need-to-occupation-map';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

const occ = resolveBrowseCategoryFilter('goldsmith');
assert(occ.kind === 'single' && occ.slug === 'goldsmith', 'occupation slug');

const store = resolveBrowseCategoryFilter('online-mobile-tablet');
assert(
  store.kind === 'single' && store.slug === 'online-mobile-tablet',
  'online store slug'
);

const need = resolveBrowseCategoryFilter('electronics');
assert(need.kind === 'any-of' || need.kind === 'single', 'electronics need maps to occupations');
if (need.kind === 'any-of') {
  const expected = expandOccupationsForNeedMatch('electronics');
  assert(need.slugs.length === expected.length, 'electronics expansion count');
}

const none = resolveBrowseCategoryFilter('not-a-real-slug-xyz');
assert(none.kind === 'none', 'unknown slug → none');

assert(browseCategorySegmentKind('goldsmith') === 'profileCategory', 'profile segment kind');
assert(browseCategorySegmentKind('electronics') === 'needCategory', 'need segment kind');

const prismaWhere = categoryFilterToPrismaWhere({ kind: 'single', slug: 'goldsmith' });
assert(
  prismaWhere != null && 'categorySlugs' in prismaWhere,
  'prisma where for single slug'
);

if (failed === 0) {
  console.log('OK: browse category filter self-test passed');
  process.exit(0);
}
process.exit(1);
