/**
 * Store vitrine categories in profile extensions + per-offer category tag in features JSON.
 */
import type { StorefrontCategory, StorefrontExtension } from '@/contracts/business-profile';

export {
  LEGACY_VITRINE_CATEGORY_PREFIX as VITRINE_CATEGORY_FEATURE_PREFIX,
  parseOfferFeatures,
  withVitrineCategoryId,
  offerMatchesCategoryFilter,
} from '@/lib/business/offer-storefront-meta';

export function createStorefrontCategoryId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cat-${Date.now().toString(36)}`;
}

export function parseStorefrontExtension(raw: unknown): StorefrontExtension {
  if (!raw || typeof raw !== 'object') return { categories: [] };
  const o = raw as Record<string, unknown>;
  const cats = o.categories;
  if (!Array.isArray(cats)) return { categories: [] };
  const categories: StorefrontCategory[] = cats
    .filter((c): c is Record<string, unknown> => c != null && typeof c === 'object')
    .map((c) => ({
      id: String(c.id ?? ''),
      title: String(c.title ?? '').trim(),
      sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : 0,
    }))
    .filter((c) => c.id && c.title)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return { categories };
}

export function groupOffersByVitrineCategory<
  T extends {
    id: string;
    vitrineCategoryId?: string | null;
    categoryIds?: string[];
  },
>(offers: T[], categories: StorefrontCategory[]): { category: StorefrontCategory | null; offers: T[] }[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const groups: { category: StorefrontCategory | null; offers: T[] }[] = categories.map((c) => ({
    category: c,
    offers: [],
  }));
  const uncategorized: T[] = [];

  for (const offer of offers) {
    const ids = offer.categoryIds?.length
      ? offer.categoryIds
      : offer.vitrineCategoryId
        ? [offer.vitrineCategoryId]
        : [];
    let placed = false;
    for (const catId of ids) {
      if (!byId.has(catId)) continue;
      const g = groups.find((x) => x.category?.id === catId);
      if (g) {
        g.offers.push(offer);
        placed = true;
      }
    }
    if (!placed) uncategorized.push(offer);
  }

  if (uncategorized.length > 0) {
    groups.push({ category: null, offers: uncategorized });
  }

  return groups.filter((g) => g.offers.length > 0);
}
