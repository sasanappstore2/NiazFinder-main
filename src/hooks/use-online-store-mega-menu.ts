'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getDefaultManagedOnlineStores,
  getOnlineStoresCacheTimestamp,
  setOnlineStoresCache,
} from '@/lib/business/online-stores-cache';
import type { ManagedOnlineStoreCategory } from '@/lib/business/online-stores-cache';
import type { OccupationMegaMenuNode } from '@/lib/business/occupation-mega-menu';
import {
  filterOnlineStoreMegaMenu,
  getOnlineStoreMegaMenuTree,
} from '@/lib/business/online-store-mega-menu';
import { BUSINESS_TAXONOMY_INVALIDATE_EVENT } from '@/hooks/invalidate-business-taxonomy';

function seedLaunchDefaults(): void {
  if (getOnlineStoresCacheTimestamp() === 0) {
    setOnlineStoresCache(getDefaultManagedOnlineStores());
  }
}

async function fetchOnlineStoreRegistry(force = false): Promise<OccupationMegaMenuNode[]> {
  if (!force) seedLaunchDefaults();

  try {
    const res = await fetch('/api/business/online-stores');
    if (!res.ok) return getOnlineStoreMegaMenuTree();
    const data = (await res.json()) as { categories?: ManagedOnlineStoreCategory[] };
    if (data.categories) {
      setOnlineStoresCache(data.categories);
    }
  } catch {
    seedLaunchDefaults();
  }

  return getOnlineStoreMegaMenuTree();
}

/** Load admin-managed online stores into client cache and rebuild mega menu tree. */
export function useOnlineStoreMegaMenuTree() {
  const [tree, setTree] = useState<OccupationMegaMenuNode[]>(() => {
    seedLaunchDefaults();
    return getOnlineStoreMegaMenuTree();
  });

  const reload = useCallback(async (force = false) => {
    const next = await fetchOnlineStoreRegistry(force);
    setTree(next);
    return next;
  }, []);

  useEffect(() => {
    void reload();

    const onInvalidate = () => {
      void reload(true);
    };
    window.addEventListener(BUSINESS_TAXONOMY_INVALIDATE_EVENT, onInvalidate);
    return () => window.removeEventListener(BUSINESS_TAXONOMY_INVALIDATE_EVENT, onInvalidate);
  }, [reload]);

  const filterMenu = useCallback((query: string) => filterOnlineStoreMegaMenu(query, tree), [tree]);

  return { tree, filterMenu, reload };
}
