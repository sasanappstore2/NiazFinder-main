'use client';

import { useCallback, useEffect, useState } from 'react';
import { setOccupationsCache } from '@/lib/business/occupations-cache';
import type { ManagedBusinessOccupation } from '@/lib/business/occupations-cache';
import {
  filterOccupationMegaMenu,
  getOccupationMegaMenuTree,
  type OccupationMegaMenuNode,
} from '@/lib/business/occupation-mega-menu';

/** Load admin-managed occupations into client cache and rebuild mega menu tree. */
export function useOccupationMegaMenuTree() {
  const [tree, setTree] = useState<OccupationMegaMenuNode[]>(() => getOccupationMegaMenuTree());

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/business/occupations')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { occupations?: ManagedBusinessOccupation[] } | null) => {
        if (cancelled || !data?.occupations) return;
        setOccupationsCache(data.occupations);
        setTree(getOccupationMegaMenuTree());
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const filterMenu = useCallback((query: string) => filterOccupationMegaMenu(query, tree), [tree]);

  return { tree, filterMenu };
}
