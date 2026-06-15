import { getCategoryBySlug, getCategoryPath } from '@/config/categories';

/** Slug → inferred attribute values from URL path (skip redundant browse pills). */
const LEAF_PROPERTY_KIND: Record<string, string> = {
  'apartment-sale': 'apartment',
  'villa-sale': 'villa',
  'land-sale': 'land',
  'land-rent': 'land',
  'apartment-rent': 'apartment',
  'villa-rent': 'villa',
  'office-sale': 'office',
  'shop-sale': 'shop',
  'industrial-sale': 'industrial',
  'office-rent': 'office',
  'shop-rent': 'shop',
  'industrial-rent': 'industrial',
  'suite-apartment-rent': 'apartment',
  'villa-short-rent': 'villa',
  'workspace-short-rent': 'office',
};

const LEAF_VEHICLE_KIND: Record<string, string> = {
  'car-ride': 'car',
  'car-heavy': 'heavy',
  'car-classic': 'classic',
  'car-rental': 'car',
  motorcycle: 'motorcycle',
  'spare-parts': 'parts',
};

const PARENT_DEAL_HINT: Record<string, string[]> = {
  'residential-sale': ['buy', 'sell'],
  'commercial-sale': ['buy', 'sell'],
  'residential-rent': ['rent_monthly', 'rent_rahn_full', 'rent_rahn_ejare'],
  'commercial-rent': ['rent_monthly', 'rent_rahn_full', 'rent_rahn_ejare'],
  'short-term-rent': ['rent_short_term'],
  'car-rental': ['rent'],
};

export interface PathInferredAttrs {
  values: Record<string, string>;
  /** Filter field keys to hide in browse UI. */
  hiddenKeys: Set<string>;
}

export function inferAttributesFromPath(categorySlug: string | null | undefined): PathInferredAttrs {
  const hiddenKeys = new Set<string>();
  const values: Record<string, string> = {};

  if (!categorySlug) {
    return { values, hiddenKeys };
  }

  const cat = getCategoryBySlug(categorySlug);
  const path = getCategoryPath(categorySlug);
  const slugs = path.map((c) => c.slug);

  if (LEAF_PROPERTY_KIND[categorySlug]) {
    values.propertyKind = LEAF_PROPERTY_KIND[categorySlug];
    hiddenKeys.add('propertyKind');
  }

  if (LEAF_VEHICLE_KIND[categorySlug]) {
    values.vehicleKind = LEAF_VEHICLE_KIND[categorySlug];
    hiddenKeys.add('vehicleKind');
    if (categorySlug === 'spare-parts') {
      values.dealType = 'parts';
      hiddenKeys.add('dealType');
    }
    if (categorySlug === 'car-rental') {
      values.dealType = 'rent';
      hiddenKeys.add('dealType');
    }
  }

  for (const slug of slugs) {
    const hints = PARENT_DEAL_HINT[slug];
    if (hints?.length === 1) {
      values.dealType = hints[0];
      hiddenKeys.add('dealType');
    }
  }

  if (categorySlug.endsWith('-sale') && !values.dealType) {
    hiddenKeys.add('dealType');
  }
  if (
    categorySlug.endsWith('-rent') &&
    !values.dealType &&
    !categorySlug.includes('short') &&
    categorySlug !== 'suite-apartment-rent' &&
    categorySlug !== 'workspace-short-rent'
  ) {
    hiddenKeys.add('dealType');
  }
  if (
    categorySlug === 'suite-apartment-rent' ||
    categorySlug === 'villa-short-rent' ||
    categorySlug === 'workspace-short-rent'
  ) {
    values.dealType = 'rent_short_term';
    hiddenKeys.add('dealType');
  }

  if (cat && cat.depth === 1 && slugs[0] === 'services') {
    values.serviceCategory = categorySlug;
    hiddenKeys.add('serviceCategory');
  }

  if (cat && cat.depth === 2 && slugs.includes('repairs')) {
    values.serviceCategory = 'repairs';
    hiddenKeys.add('serviceCategory');
  }

  if (categorySlug === 'pre-sale-services') {
    hiddenKeys.add('propertyKind');
  }

  return { values, hiddenKeys };
}
