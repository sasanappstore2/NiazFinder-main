/**
 * Business occupations slug uniqueness parity.
 */
import { DEFAULT_BUSINESS_OCCUPATIONS } from '@/config/business-occupations-defaults';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const slugs = new Set<string>();
  for (const occ of DEFAULT_BUSINESS_OCCUPATIONS) {
    assert(Boolean(occ.slug), `missing slug: ${occ.title}`);
    assert(!slugs.has(occ.slug), `duplicate slug: ${occ.slug}`);
    slugs.add(occ.slug);
    if (occ.parentSlug) {
      assert(occ.depth >= 1, `child should have depth>=1: ${occ.slug}`);
    } else {
      assert(occ.depth === 0, `root should have depth 0: ${occ.slug}`);
    }
  }
  console.log(`occupations-parity self-test passed (${slugs.size} slugs)`);
}

main();
