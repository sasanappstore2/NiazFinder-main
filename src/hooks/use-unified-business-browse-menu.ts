'use client';

import { useMemo } from 'react';
import { useOccupationMegaMenuTree } from '@/hooks/use-occupation-mega-menu';
import {
  buildUnifiedBusinessBrowseMegaMenuTree,
  filterUnifiedBusinessBrowseMegaMenu,
} from '@/lib/business/unified-business-browse-mega-menu';

/** Unified browse menu (online stores + occupations) with live registry. */
export function useUnifiedBusinessBrowseMegaMenu() {
  const { tree: occupationTree } = useOccupationMegaMenuTree();
  const tree = useMemo(
    () => buildUnifiedBusinessBrowseMegaMenuTree(occupationTree),
    [occupationTree]
  );
  const filterMenu = useMemo(
    () => (query: string) => filterUnifiedBusinessBrowseMegaMenu(query, tree),
    [tree]
  );
  return { tree, filterMenu };
}
