/**
 * Compare mega-menu leaf count vs canonical registry (depth >= 1).
 */
import { CANONICAL_CATEGORIES } from '../src/config/categories';
import {
  ALL_CATEGORIES,
  getMegaMenuCanonicalSlug,
  type MegaMenuCategory,
} from '../src/components/navigation/MegaMenu/CategoryMegaMenu';

function collectMegaLeaves(nodes: MegaMenuCategory[]): string[] {
  const slugs: string[] = [];
  for (const node of nodes) {
    if (node.subCategories?.length) {
      slugs.push(...collectMegaLeaves(node.subCategories));
    } else {
      slugs.push(getMegaMenuCanonicalSlug(node));
    }
  }
  return slugs;
}

const canonicalLeaves = CANONICAL_CATEGORIES.filter((c) => {
  if (c.depth === 2) return true;
  if (c.depth === 1) {
    return !CANONICAL_CATEGORIES.some((x) => x.parentSlug === c.slug);
  }
  return false;
}).map((c) => c.slug);
const megaLeaves = collectMegaLeaves(ALL_CATEGORIES);

const canonicalSet = new Set(canonicalLeaves);
const megaSet = new Set(megaLeaves);

const missingInMega = canonicalLeaves.filter((s) => !megaSet.has(s));
const missingInCanonical = megaLeaves.filter((s) => !canonicalSet.has(s));

console.log(`Canonical leaves: ${canonicalLeaves.length}`);
console.log(`Mega menu leaves: ${megaLeaves.length}`);
console.log(`Missing in mega menu (${missingInMega.length}):`, missingInMega.slice(0, 20));
console.log(`Missing in canonical (${missingInCanonical.length}):`, missingInCanonical.slice(0, 20));

if (missingInMega.length > 0 || missingInCanonical.length > 0) {
  process.exit(1);
}
console.log('Parity OK.');
