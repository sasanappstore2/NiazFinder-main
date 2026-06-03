'use client';

import { useCallback, useEffect, useState } from 'react';
import { setOnlineStoresCache } from '@/lib/business/online-stores-cache';
import type { ManagedOnlineStoreCategory } from '@/lib/business/online-stores-cache';
import type { OccupationMegaMenuNode } from '@/lib/business/occupation-mega-menu';
import {
  filterOnlineStoreMegaMenu,
  getOnlineStoreMegaMenuTree,
} from '@/lib/business/online-store-mega-menu';

/** Load admin-managed online stores into client cache and rebuild mega menu tree. */
export function useOnlineStoreMegaMenuTree() {
  const [tree, setTree] = useState<OccupationMegaMenuNode[]>(() => getOnlineStoreMegaMenuTree());

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/business/online-stores')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { categories?: ManagedOnlineStoreCategory[] } | null) => {
        if (cancelled || !data?.categories) return;
        setOnlineStoresCache(data.categories);
        setTree(getOnlineStoreMegaMenuTree());
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const filterMenu = useCallback((query: string) => filterOnlineStoreMegaMenu(query, tree), [tree]);

  return { tree, filterMenu };
}
