import {
  CANONICAL_CATEGORIES,
  getCategoryBySlug,
  getCategoryPath,
  type CanonicalCategory,
} from '@/config/categories';
import {
  inferListingDealTypeFromCategory,
  isListingSaleDeal,
  isListingShortTermDeal,
  normalizeListingDealType,
  type PropertyListingDealTypeStored,
} from '@/lib/business/real-estate-listing-deal-types';

const PROPERTY_LISTING_PARENTS = new Set([
  'residential-sale',
  'residential-rent',
  'commercial-sale',
  'commercial-rent',
  'short-term-rent',
]);

const SHORT_TERM_SLUGS = new Set([
  'suite-apartment-rent',
  'villa-short-rent',
  'workspace-short-rent',
]);

function isPropertyListingLeaf(cat: CanonicalCategory): boolean {
  if (cat.depth !== 2 || !cat.parentSlug) return false;
  const parent = getCategoryBySlug(cat.parentSlug);
  return parent?.parentSlug === 'real-estate' && PROPERTY_LISTING_PARENTS.has(parent.slug);
}

export function getPropertyListingCategories(
  dealType: PropertyListingDealTypeStored = 'sell'
): CanonicalCategory[] {
  const normalized = normalizeListingDealType(dealType);
  const leaves = CANONICAL_CATEGORIES.filter(isPropertyListingLeaf);

  if (normalized === 'rent_short_term') {
    return leaves.filter((c) => SHORT_TERM_SLUGS.has(c.slug));
  }

  if (!isListingSaleDeal(dealType)) {
    return leaves.filter((c) => c.slug.endsWith('-rent') && !SHORT_TERM_SLUGS.has(c.slug));
  }

  return leaves.filter(
    (c) =>
      c.slug.endsWith('-sale') ||
      c.slug === 'construction-partnership' ||
      c.slug === 'pre-sale-services'
  );
}

export function inferDealTypeFromCategorySlug(
  slug: string | undefined
): PropertyListingDealTypeStored | undefined {
  return inferListingDealTypeFromCategory(slug);
}

export function isShortTermListingCategory(slug: string | undefined): boolean {
  if (!slug) return false;
  return SHORT_TERM_SLUGS.has(slug);
}

export function propertyListingCategoryLabel(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  const cat = getCategoryBySlug(slug);
  if (cat) {
    const path = getCategoryPath(slug);
    const parent = path.length >= 2 ? path[path.length - 2] : null;
    return parent ? `${parent.title} · ${cat.title}` : cat.title;
  }
  return slug;
}
