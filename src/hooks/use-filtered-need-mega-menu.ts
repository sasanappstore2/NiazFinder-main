'use client';

import { useMemo } from 'react';
import {
  ALL_CATEGORIES,
  type MegaMenuCategory,
} from '@/components/navigation/MegaMenu/CategoryMegaMenu';
import { filterMegaMenuByActiveSlugs } from '@/lib/categories/filter-mega-menu';
import { useActiveCategorySlugs } from '@/hooks/use-active-category-slugs';

/** Need mega menu tree filtered by DB Category.status (ACTIVE only). */
export function useFilteredNeedMegaMenu(): MegaMenuCategory[] {
  const activeSlugs = useActiveCategorySlugs();
  return useMemo(
    () => filterMegaMenuByActiveSlugs(ALL_CATEGORIES, activeSlugs),
    [activeSlugs]
  );
}
