/**
 * Unified browse mega menu: online stores (first, bold root) + occupation sectors.
 */
import { Store } from 'lucide-react';
import {
  getAllOnlineStoreMenuLeaves,
  getOnlineStoreSectorColor,
  filterOnlineStoreMegaMenu,
} from '@/lib/business/online-store-mega-menu';
import {
  getOccupationMegaMenuTree,
  filterOccupationMegaMenu,
  getOccupationSectorColor,
  type OccupationMegaMenuNode,
} from '@/lib/business/occupation-mega-menu';

const ONLINE_STORES_BROWSE_ROOT_ID = 'online-stores-browse-root';

function buildOnlineStoresBrowseRoot(): OccupationMegaMenuNode {
  return {
    id: ONLINE_STORES_BROWSE_ROOT_ID,
    slug: ONLINE_STORES_BROWSE_ROOT_ID,
    name: 'فروشگاه‌های اینترنتی',
    label: 'فروشگاه‌های اینترنتی',
    value: ONLINE_STORES_BROWSE_ROOT_ID,
    icon: Store,
    color: '#2563eb',
    parent: null,
    pickable: false,
    subCategories: getAllOnlineStoreMenuLeaves(),
  };
}

export function buildUnifiedBusinessBrowseMegaMenuTree(
  occupationTree: OccupationMegaMenuNode[] = getOccupationMegaMenuTree()
): OccupationMegaMenuNode[] {
  return [buildOnlineStoresBrowseRoot(), ...occupationTree];
}

export function getUnifiedBusinessBrowseMegaMenuTree(): OccupationMegaMenuNode[] {
  return buildUnifiedBusinessBrowseMegaMenuTree();
}

/** @deprecated Use getUnifiedBusinessBrowseMegaMenuTree() */
export const UNIFIED_BUSINESS_BROWSE_MEGA_MENU_TREE = buildUnifiedBusinessBrowseMegaMenuTree();

export function filterUnifiedBusinessBrowseMegaMenu(
  query: string,
  tree: OccupationMegaMenuNode[] = getUnifiedBusinessBrowseMegaMenuTree()
): { sectors: OccupationMegaMenuNode[]; flatJobs: OccupationMegaMenuNode[] } {
  const q = query.trim();
  if (!q) {
    return { sectors: tree, flatJobs: [] };
  }

  const online = filterOnlineStoreMegaMenu(q);
  const occupation = filterOccupationMegaMenu(q, tree.slice(1));
  const flatJobs = [...online.flatJobs, ...occupation.flatJobs];

  const sectors: OccupationMegaMenuNode[] = [];
  if (online.flatJobs.length > 0) {
    sectors.push({
      ...buildOnlineStoresBrowseRoot(),
      subCategories: online.flatJobs,
    });
  }
  sectors.push(...occupation.sectors);

  return { sectors, flatJobs };
}

export function unifiedBrowseSectorColor(parentSlug: string): string {
  if (parentSlug === ONLINE_STORES_BROWSE_ROOT_ID) return '#2563eb';
  return getOccupationSectorColor(parentSlug) || getOnlineStoreSectorColor(parentSlug);
}

export function isUnifiedBrowseNavigableSlug(slug: string): boolean {
  return slug !== ONLINE_STORES_BROWSE_ROOT_ID;
}
