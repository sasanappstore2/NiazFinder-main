/**
 * Canonical category registry — **need / listing marketplace only**.
 *
 * Business profiles use occupation slugs from `@/config/business-occupations`.
 * Do not use these slugs for business onboarding or `BusinessProfile.categorySlugs`.
 *
 * Rules (locked, per architecture spec):
 * - Each category has a SHORT, LANGUAGE-INDEPENDENT slug.
 *   GOOD: "plumbing", "apartment-sale", "mobile-phone"
 *   BAD : "real-estate-residential-sale-apartment-sale"
 * - Slugs are unique across the whole tree.
 * - Parent-child links are stored in `parentSlug`, NOT in the slug string.
 * - URLs only ever encode at most parent + child:
 *     /browse/{category}             — top-level or leaf
 *     /browse/{parent}/{category}    — nested (parent is parent-of-leaf)
 */

import { REPAIR_SUBCATEGORIES } from '@/config/repair-subcategories';

export interface CanonicalCategory {
  /** Short canonical slug used in URLs. Stable, language-independent. */
  slug: string;
  /** Parent slug, or null for top-level. */
  parentSlug: string | null;
  /** Human-readable title (Persian for now). */
  title: string;
  /** Optional English title for SEO/multilingual. */
  englishTitle?: string;
  /** Convenience: depth in the tree (0 = root). */
  depth: 0 | 1 | 2;
}

/**
 * Flat registry — single source of truth.
 *
 * Depth 0 = top section (e.g. "real-estate")
 * Depth 1 = parent (e.g. "residential-sale")
 * Depth 2 = leaf   (e.g. "apartment-sale")
 *
 * In URLs we expose depth-1 and depth-2 (parent/child). Depth-0 is for menu
 * grouping only and never appears alone in a /browse path.
 */
export const CANONICAL_CATEGORIES: readonly CanonicalCategory[] = [
  { slug: 'real-estate',         parentSlug: null,                 title: 'املاک',          englishTitle: 'Real Estate',     depth: 0 },
  { slug: 'residential-sale',    parentSlug: 'real-estate',        title: 'فروش مسکونی',    englishTitle: 'Residential Sale',depth: 1 },
  { slug: 'apartment-sale',      parentSlug: 'residential-sale',   title: 'آپارتمان',       englishTitle: 'Apartment Sale',  depth: 2 },
  { slug: 'villa-sale',          parentSlug: 'residential-sale',   title: 'خانه و ویلا',    englishTitle: 'Villa Sale',      depth: 2 },
  { slug: 'land-sale',           parentSlug: 'residential-sale',   title: 'زمین و کلنگی',   englishTitle: 'Land Sale',       depth: 2 },
  { slug: 'residential-rent',    parentSlug: 'real-estate',        title: 'اجاره مسکونی',   englishTitle: 'Residential Rent',depth: 1 },
  { slug: 'apartment-rent',      parentSlug: 'residential-rent',   title: 'آپارتمان',       englishTitle: 'Apartment Rent',  depth: 2 },
  { slug: 'villa-rent',          parentSlug: 'residential-rent',   title: 'خانه و ویلا',    englishTitle: 'Villa Rent',      depth: 2 },
  { slug: 'land-rent',           parentSlug: 'residential-rent',   title: 'زمین و کلنگی',   englishTitle: 'Land Rent',       depth: 2 },
  { slug: 'commercial-sale',     parentSlug: 'real-estate',        title: 'فروش اداری و تجاری',                                depth: 1 },
  { slug: 'office-sale',         parentSlug: 'commercial-sale',    title: 'دفتر کار',       englishTitle: 'Office Sale',     depth: 2 },
  { slug: 'shop-sale',           parentSlug: 'commercial-sale',    title: 'مغازه و غرفه',   englishTitle: 'Shop Sale',       depth: 2 },
  { slug: 'industrial-sale',     parentSlug: 'commercial-sale',    title: 'صنعتی',          englishTitle: 'Industrial Sale', depth: 2 },
  { slug: 'commercial-rent',     parentSlug: 'real-estate',        title: 'اجاره اداری و تجاری',                               depth: 1 },
  { slug: 'office-rent',         parentSlug: 'commercial-rent',    title: 'دفتر کار',       englishTitle: 'Office Rent',     depth: 2 },
  { slug: 'shop-rent',           parentSlug: 'commercial-rent',    title: 'مغازه و غرفه',   englishTitle: 'Shop Rent',       depth: 2 },
  { slug: 'industrial-rent',     parentSlug: 'commercial-rent',    title: 'صنعتی',          englishTitle: 'Industrial Rent', depth: 2 },
  { slug: 'short-term-rent',     parentSlug: 'real-estate',        title: 'اجاره کوتاه‌مدت', englishTitle: 'Short-term Rent', depth: 1 },
  { slug: 'suite-apartment-rent', parentSlug: 'short-term-rent',   title: 'آپارتمان و سوئیت', englishTitle: 'Suite Apartment Rent', depth: 2 },
  { slug: 'villa-short-rent',    parentSlug: 'short-term-rent',    title: 'ویلا و باغ',     englishTitle: 'Villa Short Rent', depth: 2 },
  { slug: 'workspace-short-rent', parentSlug: 'short-term-rent',   title: 'دفتر و فضای آموزشی', englishTitle: 'Workspace Short Rent', depth: 2 },
  { slug: 'real-estate-services',parentSlug: 'real-estate',        title: 'خدمات املاک',                                       depth: 1 },
  { slug: 'agency-services',     parentSlug: 'real-estate-services',title: 'آژانس املاک',                                      depth: 2 },
  { slug: 'construction-partnership', parentSlug: 'real-estate-services', title: 'مشارکت در ساخت',                            depth: 2 },
  { slug: 'pre-sale-services',   parentSlug: 'real-estate-services',title: 'پیش‌فروش',                                          depth: 2 },

  { slug: 'vehicles',            parentSlug: null,                 title: 'وسایل نقلیه',    englishTitle: 'Vehicles',        depth: 0 },
  { slug: 'car',                 parentSlug: 'vehicles',           title: 'خودرو',          englishTitle: 'Car',             depth: 1 },
  { slug: 'car-ride',            parentSlug: 'car',                title: 'سواری',                                             depth: 2 },
  { slug: 'car-heavy',           parentSlug: 'car',                title: 'سنگین',                                             depth: 2 },
  { slug: 'car-classic',         parentSlug: 'car',                title: 'کلاسیک',                                            depth: 2 },
  { slug: 'car-rental',          parentSlug: 'car',                title: 'اجاره‌ای',                                          depth: 2 },
  { slug: 'motorcycle',          parentSlug: 'vehicles',           title: 'موتورسیکلت',     englishTitle: 'Motorcycle',      depth: 1 },
  { slug: 'spare-parts',         parentSlug: 'vehicles',           title: 'قطعات یدکی',                                        depth: 1 },
  { slug: 'boat',                parentSlug: 'vehicles',           title: 'قایق',                                              depth: 1 },

  { slug: 'electronics',         parentSlug: null,                 title: 'لوازم الکترونیکی', englishTitle: 'Electronics',  depth: 0 },
  { slug: 'mobile-tablet',       parentSlug: 'electronics',        title: 'موبایل و تبلت',                                     depth: 1 },
  { slug: 'mobile-phone',        parentSlug: 'mobile-tablet',      title: 'گوشی موبایل',    englishTitle: 'Mobile Phone',    depth: 2 },
  { slug: 'tablet',              parentSlug: 'mobile-tablet',      title: 'تبلت',           englishTitle: 'Tablet',          depth: 2 },
  { slug: 'mobile-accessories',  parentSlug: 'mobile-tablet',      title: 'لوازم جانبی',                                       depth: 2 },
  { slug: 'computer',            parentSlug: 'electronics',        title: 'رایانه',         englishTitle: 'Computer',        depth: 1 },
  { slug: 'desktop-computer',    parentSlug: 'computer',           title: 'رومیزی',                                            depth: 2 },
  { slug: 'laptop',              parentSlug: 'computer',           title: 'لپ‌تاپ',                                            depth: 2 },
  { slug: 'computer-parts',      parentSlug: 'computer',           title: 'قطعات',                                             depth: 2 },
  { slug: 'game-console',        parentSlug: 'electronics',        title: 'کنسول و بازی',                                      depth: 1 },
  { slug: 'audio-video',         parentSlug: 'electronics',        title: 'صوتی و تصویری',                                     depth: 1 },
  { slug: 'camera',              parentSlug: 'electronics',        title: 'دوربین',         englishTitle: 'Camera',          depth: 1 },

  { slug: 'home-appliances',     parentSlug: null,                 title: 'لوازم خانگی',    englishTitle: 'Home Appliances', depth: 0 },
  { slug: 'kitchen-appliances',  parentSlug: 'home-appliances',    title: 'آشپزخانه',                                          depth: 1 },
  { slug: 'refrigerator',        parentSlug: 'kitchen-appliances', title: 'یخچال',                                             depth: 2 },
  { slug: 'washing-machine',     parentSlug: 'kitchen-appliances', title: 'ماشین شستشو',                                       depth: 2 },
  { slug: 'stove-microwave',     parentSlug: 'kitchen-appliances', title: 'اجاق و مایکروویو',                                  depth: 2 },
  { slug: 'cooking-utensils',    parentSlug: 'kitchen-appliances', title: 'ظروف',                                              depth: 2 },
  { slug: 'furniture-decor',     parentSlug: 'home-appliances',    title: 'مبلمان و دکوراسیون',                                depth: 1 },
  { slug: 'sofa-chair',          parentSlug: 'furniture-decor',    title: 'مبلمان',                                            depth: 2 },
  { slug: 'table-closet',        parentSlug: 'furniture-decor',    title: 'میز و کمد',                                         depth: 2 },
  { slug: 'lighting',            parentSlug: 'furniture-decor',    title: 'روشنایی',                                           depth: 2 },
  { slug: 'decorative-art',     parentSlug: 'furniture-decor',     title: 'تزیینی',                                            depth: 2 },
  { slug: 'rugs',                parentSlug: 'home-appliances',    title: 'فرش و گلیم',                                        depth: 1 },
  { slug: 'building-industrial', parentSlug: 'home-appliances',    title: 'ابزار ساختمانی',                                    depth: 1 },

  { slug: 'services',            parentSlug: null,                 title: 'خدمات',          englishTitle: 'Services',        depth: 0 },
  { slug: 'repairs',             parentSlug: 'services',           title: 'تعمیرات',        englishTitle: 'Repairs',         depth: 1 },
  ...REPAIR_SUBCATEGORIES.map((item) => ({
    slug: item.slug,
    parentSlug: 'repairs' as const,
    title: item.title,
    englishTitle: item.englishTitle,
    depth: 2 as const,
  })),
  { slug: 'cleaning',            parentSlug: 'services',           title: 'نظافت',          englishTitle: 'Cleaning',        depth: 1 },
  { slug: 'plumbing',            parentSlug: 'services',           title: 'لوله‌کشی',       englishTitle: 'Plumbing',        depth: 1 },
  { slug: 'moving',              parentSlug: 'services',           title: 'اسباب‌کشی و باربری', englishTitle: 'Moving',      depth: 1 },
  { slug: 'electrical',          parentSlug: 'services',           title: 'برق‌کاری',       englishTitle: 'Electrical',      depth: 1 },
  { slug: 'painting',            parentSlug: 'services',           title: 'نقاشی و کاغذدیواری', englishTitle: 'Painting',    depth: 1 },
  { slug: 'medical-health',      parentSlug: 'services',           title: 'خدمات درمانی و پزشکی', englishTitle: 'Medical',   depth: 1 },
  { slug: 'legal-services',      parentSlug: 'services',           title: 'مشاوره حقوقی',  englishTitle: 'Legal',           depth: 1 },
  { slug: 'it-services',         parentSlug: 'services',           title: 'خدمات فناوری',   englishTitle: 'IT Services',     depth: 1 },
  { slug: 'transportation',      parentSlug: 'services',           title: 'حمل و نقل',                                         depth: 1 },
  { slug: 'beauty-health',       parentSlug: 'services',           title: 'زیبایی',                                            depth: 1 },
  { slug: 'events-catering',     parentSlug: 'services',           title: 'مراسم',                                             depth: 1 },
  { slug: 'education',           parentSlug: 'services',           title: 'آموزش',          englishTitle: 'Education',       depth: 1 },

  { slug: 'personal-items',      parentSlug: null,                 title: 'وسایل شخصی',                                        depth: 0 },
  { slug: 'clothing',            parentSlug: 'personal-items',     title: 'پوشاک',          englishTitle: 'Clothing',        depth: 1 },
  { slug: 'jewelry-watches',     parentSlug: 'personal-items',     title: 'جواهرات',                                           depth: 1 },
  { slug: 'cosmetics-health',    parentSlug: 'personal-items',     title: 'آرایشی',                                            depth: 1 },
  { slug: 'kids-baby',           parentSlug: 'personal-items',     title: 'کودک',                                              depth: 1 },

  { slug: 'entertainment',       parentSlug: null,                 title: 'سرگرمی',         englishTitle: 'Entertainment',   depth: 0 },
  { slug: 'books',               parentSlug: 'entertainment',      title: 'کتاب',                                              depth: 1 },
  { slug: 'tickets',             parentSlug: 'entertainment',      title: 'بلیط',                                              depth: 1 },
  { slug: 'tours',               parentSlug: 'entertainment',      title: 'تور',                                               depth: 1 },
  { slug: 'sports-fitness',      parentSlug: 'entertainment',      title: 'ورزش',                                              depth: 1 },
  { slug: 'bicycle',             parentSlug: 'sports-fitness',     title: 'دوچرخه',         englishTitle: 'Bicycle',         depth: 2 },
  { slug: 'scooter',             parentSlug: 'sports-fitness',     title: 'اسکوتر و اسکیت', englishTitle: 'Scooter & Skate', depth: 2 },
  { slug: 'fitness-equipment',   parentSlug: 'sports-fitness',     title: 'تجهیزات بدنسازی', englishTitle: 'Fitness Equipment', depth: 2 },
  { slug: 'camping-outdoor',     parentSlug: 'sports-fitness',     title: 'کوهنوردی و کمپینگ', englishTitle: 'Camping & Outdoor', depth: 2 },
  { slug: 'pets',                parentSlug: 'entertainment',      title: 'حیوانات',                                           depth: 1 },
  { slug: 'musical-instruments', parentSlug: 'entertainment',      title: 'موسیقی',                                            depth: 1 },

  { slug: 'social',              parentSlug: null,                 title: 'اجتماعی',                                           depth: 0 },
  { slug: 'social-events',       parentSlug: 'social',             title: 'رویدادها',                                          depth: 1 },
  { slug: 'cultural-artistic',   parentSlug: 'social-events',      title: 'فرهنگی',                                            depth: 2 },
  { slug: 'conference',          parentSlug: 'social-events',      title: 'همایش',                                             depth: 2 },
  { slug: 'sporting',            parentSlug: 'social-events',      title: 'ورزشی',                                             depth: 2 },
  { slug: 'volunteering',        parentSlug: 'social',             title: 'داوطلبانه',                                         depth: 1 },
  { slug: 'lost-found',          parentSlug: 'social',             title: 'گم‌شده‌ها',                                         depth: 1 },

  { slug: 'jobs',                parentSlug: null,                 title: 'استخدام',        englishTitle: 'Jobs',            depth: 0 },
  { slug: 'admin-management',    parentSlug: 'jobs',               title: 'اداری',                                             depth: 1 },
  { slug: 'it',                  parentSlug: 'jobs',               title: 'فناوری اطلاعات', englishTitle: 'IT',              depth: 1 },
  { slug: 'finance-legal',       parentSlug: 'jobs',               title: 'مالی و حقوقی',                                      depth: 1 },
  { slug: 'marketing-sales',     parentSlug: 'jobs',               title: 'بازاریابی',                                         depth: 1 },
  { slug: 'engineering',         parentSlug: 'jobs',               title: 'فنی و مهندسی',                                      depth: 1 },
  { slug: 'art-media',           parentSlug: 'jobs',               title: 'هنر و رسانه',                                       depth: 1 },
  { slug: 'health-beauty',       parentSlug: 'jobs',               title: 'درمانی و زیبایی',                                   depth: 1 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Indexes (built once, frozen)
// ─────────────────────────────────────────────────────────────────────────────

const BY_SLUG: ReadonlyMap<string, CanonicalCategory> = new Map(
  CANONICAL_CATEGORIES.map((c) => [c.slug, c])
);

const ALL_SLUGS: ReadonlySet<string> = new Set(CANONICAL_CATEGORIES.map((c) => c.slug));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isCategorySlug(slug: string): boolean {
  return ALL_SLUGS.has(slug);
}

export function getCategoryBySlug(slug: string): CanonicalCategory | null {
  return BY_SLUG.get(slug) ?? null;
}

/**
 * Returns the chain from root → category (inclusive).
 * For "apartment-sale" → ["real-estate", "residential-sale", "apartment-sale"].
 */
export function getCategoryPath(slug: string): CanonicalCategory[] {
  const path: CanonicalCategory[] = [];
  let cursor: CanonicalCategory | null = BY_SLUG.get(slug) ?? null;
  let safety = 6;
  while (cursor && safety-- > 0) {
    path.unshift(cursor);
    cursor = cursor.parentSlug ? BY_SLUG.get(cursor.parentSlug) ?? null : null;
  }
  return path;
}

/**
 * Returns true if `parent` is a direct or transitive parent of `child`.
 */
export function isAncestorCategory(parent: string, child: string): boolean {
  const path = getCategoryPath(child);
  return path.some((c) => c.slug === parent && c.slug !== child);
}

/**
 * Map a legacy compound `value` (e.g. "real-estate-residential-sale-apartment-sale")
 * to the canonical short slug (e.g. "apartment-sale").
 *
 * Strategy: try the full string first, then strip prefixes one segment at a
 * time and look for a known slug.
 */
/** Mega-menu compound values that do not strip cleanly to a canonical slug. */
export const MEGA_VALUE_ALIASES: Readonly<Record<string, string>> = {
  'real-estate-real-estate-services-agency': 'agency-services',
  'real-estate-real-estate-services-pre-sale': 'pre-sale-services',
};

export function legacyValueToSlug(legacyValue: string | null | undefined): string | null {
  if (!legacyValue) return null;
  if (ALL_SLUGS.has(legacyValue)) return legacyValue;

  const alias = MEGA_VALUE_ALIASES[legacyValue];
  if (alias && ALL_SLUGS.has(alias)) return alias;

  const parts = legacyValue.split('-');
  for (let i = 1; i < parts.length; i++) {
    const candidate = parts.slice(i).join('-');
    if (ALL_SLUGS.has(candidate)) return candidate;
  }
  return null;
}

export interface ResolvedCategoryLevels {
  /** Deepest canonical slug (leaf or mid). */
  leafSlug: string;
  /** Depth-1 parent when leaf is depth 2; null for depth-0/1 leaves. */
  parentSlug: string | null;
  /** Depth-0 root section. */
  rootSlug: string;
  /** Slug stored as ServiceRequest.category (depth-1 or depth-1 parent). */
  categorySlug: string;
  /** Slug stored as ServiceRequest.subcategory when depth=2. */
  subcategorySlug: string | null;
}

/**
 * Resolve any canonical or legacy slug to category/subcategory slugs for DB storage.
 */
export function resolveCategoryLevels(
  slugOrLegacy: string,
  explicitSubcategory?: string | null
): ResolvedCategoryLevels | null {
  const normalized =
    legacyValueToSlug(slugOrLegacy) ?? (ALL_SLUGS.has(slugOrLegacy) ? slugOrLegacy : null);
  if (!normalized) return null;

  let leafSlug = normalized;
  if (explicitSubcategory) {
    const sub = legacyValueToSlug(explicitSubcategory) ?? explicitSubcategory;
    if (ALL_SLUGS.has(sub)) leafSlug = sub;
  }

  const cat = BY_SLUG.get(leafSlug);
  if (!cat) return null;

  const path = getCategoryPath(leafSlug);
  const rootSlug = path[0]?.slug ?? leafSlug;

  if (cat.depth === 2) {
    const parent = path[path.length - 2];
    return {
      leafSlug,
      parentSlug: parent?.slug ?? null,
      rootSlug,
      categorySlug: parent?.slug ?? leafSlug,
      subcategorySlug: leafSlug,
    };
  }

  if (cat.depth === 1) {
    return {
      leafSlug,
      parentSlug: cat.parentSlug,
      rootSlug,
      categorySlug: leafSlug,
      subcategorySlug: null,
    };
  }

  // depth 0 is a scope hint, not a concrete posting category.  The old
  // first-child fallback silently turned `services` into `repairs` and made
  // every downstream template, validator and publish projection disagree
  // with the user's text.  Keep the root intact until the user or the
  // analyzer resolves a real child.
  if (process.env.INTAKE_ROOT_CATEGORY_HINT === 'false') {
    // Controlled rollback only: restore the pre-v2 first-child behavior if a
    // deployment must temporarily disable the root-hint rollout flag.
    const firstChild = CANONICAL_CATEGORIES.find((item) => item.parentSlug === leafSlug);
    if (firstChild) return resolveCategoryLevels(firstChild.slug);
  }
  return {
    leafSlug,
    parentSlug: null,
    rootSlug: leafSlug,
    categorySlug: leafSlug,
    subcategorySlug: null,
  };
}

/** Normalize parsed intent to consistent categorySlug + subcategorySlug pair. */
export function normalizeCategoryPair(
  categorySlug: string,
  subcategorySlug?: string | null
): { categorySlug: string; subcategorySlug?: string } {
  const levels = resolveCategoryLevels(categorySlug, subcategorySlug);
  if (!levels) {
    return { categorySlug: ALL_SLUGS.has(categorySlug) ? categorySlug : 'services' };
  }
  return {
    categorySlug: levels.subcategorySlug ? levels.categorySlug : levels.leafSlug,
    subcategorySlug: levels.subcategorySlug ?? undefined,
  };
}

export function getDirectChildren(parentSlug: string | null): CanonicalCategory[] {
  return CANONICAL_CATEGORIES.filter((c) => c.parentSlug === parentSlug);
}

export const TOP_LEVEL_CATEGORIES: readonly CanonicalCategory[] =
  CANONICAL_CATEGORIES.filter((c) => c.depth === 0);
