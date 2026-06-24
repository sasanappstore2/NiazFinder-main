import type { MegaMenuCategory } from '@/components/navigation/MegaMenu/CategoryMegaMenu';
import { getMegaMenuCanonicalSlug } from '@/components/navigation/MegaMenu/CategoryMegaMenu';

export function filterMegaMenuByActiveSlugs(
  categories: MegaMenuCategory[],
  activeSlugs: ReadonlySet<string>
): MegaMenuCategory[] {
  const result: MegaMenuCategory[] = [];

  for (const cat of categories) {
    const canonical = getMegaMenuCanonicalSlug(cat);
    const filteredSubs = cat.subCategories?.length
      ? filterMegaMenuByActiveSlugs(cat.subCategories, activeSlugs)
      : [];

    const selfActive = activeSlugs.has(cat.id) || activeSlugs.has(canonical);
    if (selfActive || filteredSubs.length > 0) {
      result.push({
        ...cat,
        subCategories:
          cat.subCategories?.length && filteredSubs.length > 0
            ? filteredSubs
            : cat.subCategories?.length
              ? []
              : cat.subCategories,
      });
    }
  }

  return result;
}
