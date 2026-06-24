'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getDefaultManagedOccupations,
  getOccupationsCacheTimestamp,
  setOccupationsCache,
} from '@/lib/business/occupations-cache';
import type { ManagedBusinessOccupation } from '@/lib/business/occupations-cache';
import {
  filterOccupationMegaMenu,
  getOccupationMegaMenuTree,
  type OccupationMegaMenuNode,
} from '@/lib/business/occupation-mega-menu';
import { BUSINESS_TAXONOMY_INVALIDATE_EVENT } from '@/hooks/invalidate-business-taxonomy';

function seedLaunchDefaults(): void {
  if (getOccupationsCacheTimestamp() === 0) {
    setOccupationsCache(getDefaultManagedOccupations());
  }
}

async function fetchOccupationRegistry(force = false): Promise<OccupationMegaMenuNode[]> {
  if (!force) seedLaunchDefaults();

  try {
    const res = await fetch('/api/business/occupations');
    if (!res.ok) return getOccupationMegaMenuTree();
    const data = (await res.json()) as { occupations?: ManagedBusinessOccupation[] };
    if (data.occupations) {
      setOccupationsCache(data.occupations);
    }
  } catch {
    seedLaunchDefaults();
  }

  return getOccupationMegaMenuTree();
}

/** Load admin-managed occupations into client cache and rebuild mega menu tree. */
export function useOccupationMegaMenuTree() {
  const [tree, setTree] = useState<OccupationMegaMenuNode[]>(() => {
    seedLaunchDefaults();
    return getOccupationMegaMenuTree();
  });

  const reload = useCallback(async (force = false) => {
    const next = await fetchOccupationRegistry(force);
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

  const filterMenu = useCallback((query: string) => filterOccupationMegaMenu(query, tree), [tree]);

  return { tree, filterMenu, reload };
}
