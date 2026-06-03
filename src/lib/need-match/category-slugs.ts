import { expandOccupationsForNeedMatch, migrateSlugToOccupation } from '@/config/need-to-occupation-map';
import {
  getBusinessOccupationsList,
  getOccupationPath,
  isOccupationSlug,
  resolveOccupationSlug,
} from '@/config/business-occupations';
import {
  getOnlineStoreCategoriesList,
  getOnlineStorePath,
  isOnlineStoreSlug,
} from '@/config/online-stores';

/**
 * Occupation + online store slugs that can serve a need (from need category slug).
 * @deprecated Name kept for callers; returns profile category slugs.
 */
export function expandCategorySlugsForMatch(needSlug: string): string[] {
  return expandOccupationsForNeedMatch(needSlug);
}

/** Normalize profile `categorySlugs` (occupation, online store, or legacy need slug) for matching. */
export function normalizeProfileSlugsForMatch(storedSlugs: string[]): string[] {
  const out = new Set<string>();

  for (const raw of storedSlugs) {
    const slug = raw.trim();
    if (!slug) continue;

    if (isOnlineStoreSlug(slug)) {
      out.add(slug);
      const stores = getOnlineStoreCategoriesList();
      const store = stores.find((c) => c.slug === slug);
      if (store?.depth === 0) {
        for (const child of stores.filter((o) => o.parentSlug === slug)) {
          out.add(child.slug);
        }
      }
      for (const c of getOnlineStorePath(slug)) {
        out.add(c.slug);
      }
      continue;
    }

    if (isOccupationSlug(slug)) {
      const resolved = resolveOccupationSlug(slug);
      out.add(resolved);
      const occupations = getBusinessOccupationsList();
      const occ = occupations.find((o) => o.slug === resolved);
      if (occ?.depth === 0) {
        for (const child of occupations.filter((o) => o.parentSlug === resolved)) {
          out.add(child.slug);
        }
      }
      for (const o of getOccupationPath(resolved)) {
        out.add(o.slug);
      }
      continue;
    }

    const { occupations } = migrateSlugToOccupation(slug);
    for (const o of occupations) {
      out.add(o);
    }
  }

  return [...out];
}
