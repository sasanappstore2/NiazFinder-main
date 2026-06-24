/**
 * Unified browse mega menu: online stores (first, bold root) + occupation sectors.
 */
import { Store } from 'lucide-react';
import {
  getAllOnlineStoreMenuLeaves,
  getOnlineStoreMegaMenuTree,
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

function buildOnlineStoresBrowseRoot(leaves = getAllOnlineStoreMenuLeaves()): OccupationMegaMenuNode {
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
    subCategories: leaves,
  };
}

export function buildUnifiedBusinessBrowseMegaMenuTree(
  occupationTree: OccupationMegaMenuNode[] = getOccupationMegaMenuTree(),
  onlineStoreTree: OccupationMegaMenuNode[] = getOnlineStoreMegaMenuTree()
): OccupationMegaMenuNode[] {
  const onlineLeaves = getAllOnlineStoreMenuLeaves(onlineStoreTree);
  const roots: OccupationMegaMenuNode[] =
    onlineLeaves.length > 0 ? [buildOnlineStoresBrowseRoot(onlineLeaves)] : [];
  return [...roots, ...occupationTree];
}

export function getUnifiedBusinessBrowseMegaMenuTree(): OccupationMegaMenuNode[] {
  return buildUnifiedBusinessBrowseMegaMenuTree();
}

/** @deprecated Use getUnifiedBusinessBrowseMegaMenuTree() */
export const UNIFIED_BUSINESS_BROWSE_MEGA_MENU_TREE = buildUnifiedBusinessBrowseMegaMenuTree();

export function filterUnifiedBusinessBrowseMegaMenu(
  query: string,
  tree: OccupationMegaMenuNode[] = getUnifiedBusinessBrowseMegaMenuTree(),
  onlineStoreTree: OccupationMegaMenuNode[] = getOnlineStoreMegaMenuTree(),
  occupationTree: OccupationMegaMenuNode[] = getOccupationMegaMenuTree()
): { sectors: OccupationMegaMenuNode[]; flatJobs: OccupationMegaMenuNode[] } {
  const q = query.trim();
  if (!q) {
    return { sectors: tree, flatJobs: [] };
  }

  const hasOnlineRoot = tree[0]?.id === ONLINE_STORES_BROWSE_ROOT_ID;
  const occupationSlice = hasOnlineRoot ? tree.slice(1) : tree;

  const online = filterOnlineStoreMegaMenu(q, onlineStoreTree);
  const occupation = filterOccupationMegaMenu(q, occupationSlice.length ? occupationSlice : occupationTree);
  const flatJobs = [...online.flatJobs, ...occupation.flatJobs];

  const sectors: OccupationMegaMenuNode[] = [];
  if (online.flatJobs.length > 0) {
    sectors.push(buildOnlineStoresBrowseRoot(online.flatJobs));
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
