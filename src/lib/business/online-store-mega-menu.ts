/**
 * Mega-menu tree for online store categories (sector → vertical).
 */
import type { ElementType } from 'react';
import {
  Baby,
  BookOpen,
  Car,
  Cpu,
  Flower2,
  Gem,
  Gift,
  Globe,
  Home,
  Leaf,
  Package,
  PawPrint,
  Shirt,
  ShoppingCart,
  Store,
  Tent,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import {
  compareOnlineStoresByDisplayOrder,
  getOnlineStoreSectors,
  getPickableOnlineStores,
  type OnlineStoreCategory,
} from '@/config/online-stores';
import { getOnlineStoreLeafIcon } from '@/lib/business/online-store-icons';
import type { OccupationMegaMenuNode } from '@/lib/business/occupation-mega-menu';

const SECTOR_ICONS: Record<string, LucideIcon> = {
  'online-fashion': Shirt,
  'online-jewelry-watches': Gem,
  'online-digital': Cpu,
  'online-home-kitchen': Home,
  'online-beauty-health': Flower2,
  'online-food-grocery': ShoppingCart,
  'online-kids-baby': Baby,
  'online-sports-travel': Tent,
  'online-auto-motor': Car,
  'online-books-culture': BookOpen,
  'online-pets-plants': PawPrint,
  'online-gifts-crafts': Gift,
  'online-office-b2b': Wrench,
  'online-specialty': Package,
  'online-platform': Globe,
};

const SECTOR_COLORS: Record<string, string> = {
  'online-fashion': '#ec4899',
  'online-jewelry-watches': '#f59e0b',
  'online-digital': '#06b6d4',
  'online-home-kitchen': '#10b981',
  'online-beauty-health': '#a855f7',
  'online-food-grocery': '#84cc16',
  'online-kids-baby': '#f472b6',
  'online-sports-travel': '#0ea5e9',
  'online-auto-motor': '#ef4444',
  'online-books-culture': '#6366f1',
  'online-pets-plants': '#22c55e',
  'online-gifts-crafts': '#f43f5e',
  'online-office-b2b': '#64748b',
  'online-specialty': '#8b5cf6',
  'online-platform': '#3b82f6',
};

const DEFAULT_ICON = Store;
const DEFAULT_COLOR = '#6b7280';

export function getOnlineStoreSectorIcon(slug: string): ElementType {
  return SECTOR_ICONS[slug] ?? DEFAULT_ICON;
}

export function getOnlineStoreSectorColor(slug: string): string {
  return SECTOR_COLORS[slug] ?? DEFAULT_COLOR;
}

function leafNode(
  cat: OnlineStoreCategory,
  sectorSlug: string,
  sectorColor: string
): OccupationMegaMenuNode {
  return {
    id: cat.slug,
    slug: cat.slug,
    name: cat.title,
    label: cat.title,
    value: cat.slug,
    icon: getOnlineStoreLeafIcon(cat.slug),
    color: sectorColor,
    parent: sectorSlug,
    pickable: true,
  };
}

function sectorNode(sector: OnlineStoreCategory, leaves: OnlineStoreCategory[]): OccupationMegaMenuNode {
  const color = getOnlineStoreSectorColor(sector.slug);
  const Icon = getOnlineStoreSectorIcon(sector.slug);
  return {
    id: sector.slug,
    slug: sector.slug,
    name: sector.title,
    label: sector.title,
    value: sector.slug,
    icon: Icon,
    color,
    parent: null,
    pickable: false,
    subCategories: leaves.map((l) => leafNode(l, sector.slug, color)),
  };
}

export function buildOnlineStoreMegaMenuTree(): OccupationMegaMenuNode[] {
  const sectors = getOnlineStoreSectors();
  const leaves = getPickableOnlineStores();

  return sectors
    .map((sector) => {
      const sectorLeaves = leaves
        .filter((l) => l.parentSlug === sector.slug)
        .sort(compareOnlineStoresByDisplayOrder);
      return sectorNode(sector, sectorLeaves);
    })
    .filter((s) => (s.subCategories?.length ?? 0) > 0);
}

export const ONLINE_STORE_MEGA_MENU_TREE = buildOnlineStoreMegaMenuTree();

export function getAllOnlineStoreMenuLeaves(): OccupationMegaMenuNode[] {
  const out: OccupationMegaMenuNode[] = [];
  for (const sector of ONLINE_STORE_MEGA_MENU_TREE) {
    for (const leaf of sector.subCategories ?? []) {
      out.push(leaf);
    }
  }
  return out;
}

export function filterOnlineStoreMegaMenu(
  query: string
): { sectors: OccupationMegaMenuNode[]; flatJobs: OccupationMegaMenuNode[] } {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { sectors: ONLINE_STORE_MEGA_MENU_TREE, flatJobs: [] };
  }

  const flatJobs = getAllOnlineStoreMenuLeaves().filter(
    (j) => j.name.includes(query.trim()) || j.slug.includes(q)
  );

  const sectorSlugs = new Set(flatJobs.map((j) => j.parent).filter(Boolean));
  const sectors = ONLINE_STORE_MEGA_MENU_TREE.filter((s) => sectorSlugs.has(s.slug)).map((sector) => ({
    ...sector,
    subCategories: (sector.subCategories ?? []).filter((j) =>
      flatJobs.some((f) => f.slug === j.slug)
    ),
  }));

  return { sectors, flatJobs };
}
