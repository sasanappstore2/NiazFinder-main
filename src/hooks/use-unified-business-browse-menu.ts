'use client';

import { useMemo } from 'react';
import { useOccupationMegaMenuTree } from '@/hooks/use-occupation-mega-menu';
import { useOnlineStoreMegaMenuTree } from '@/hooks/use-online-store-mega-menu';
import {
  buildUnifiedBusinessBrowseMegaMenuTree,
  filterUnifiedBusinessBrowseMegaMenu,
} from '@/lib/business/unified-business-browse-mega-menu';

/** Unified browse menu (online stores + occupations) with live registry. */
export function useUnifiedBusinessBrowseMegaMenu() {
  const { tree: occupationTree } = useOccupationMegaMenuTree();
  const { tree: onlineStoreTree } = useOnlineStoreMegaMenuTree();
  const tree = useMemo(
    () => buildUnifiedBusinessBrowseMegaMenuTree(occupationTree, onlineStoreTree),
    [occupationTree, onlineStoreTree]
  );
  const filterMenu = useMemo(
    () => (query: string) =>
      filterUnifiedBusinessBrowseMegaMenu(query, tree, onlineStoreTree, occupationTree),
    [tree, onlineStoreTree, occupationTree]
  );
  return { tree, filterMenu };
}
