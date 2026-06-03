/**
 * Build mega-menu tree from business-occupations registry (sector → jobs).
 */
import type { ElementType } from 'react';
import {
  Briefcase,
  Building2,
  Car,
  Dumbbell,
  Flower2,
  Hammer,
  HeartPulse,
  Home,
  Laptop,
  Landmark,
  Palette,
  PartyPopper,
  PawPrint,
  Plane,
  Scale,
  Shield,
  ShoppingBag,
  Sprout,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import {
  compareOccupationsByDisplayOrder,
  getOccupationSectors,
  getPickableOccupations,
  type BusinessOccupation,
} from '@/config/business-occupations';
import { getOccupationJobIcon } from '@/lib/business/occupation-job-icons';

export interface OccupationMegaMenuNode {
  id: string;
  slug: string;
  name: string;
  label: string;
  value: string;
  icon: ElementType;
  color: string;
  parent: string | null;
  subCategories?: OccupationMegaMenuNode[];
  /** Leaf job selectable in wizard */
  pickable: boolean;
}

const SECTOR_ICONS: Record<string, LucideIcon> = {
  'real-estate-facility': Building2,
  'home-personal-services': Home,
  'trades-construction': Hammer,
  'tech-digital': Laptop,
  'transport-logistics': Car,
  'professional-legal-finance': Scale,
  'health-beauty': HeartPulse,
  'creative-media': Palette,
  'education-coaching': Dumbbell,
  'food-hospitality': UtensilsCrossed,
  'events-services': PartyPopper,
  'crafts-repair': Wrench,
  'pets-services': PawPrint,
  'travel-tourism': Plane,
  'security-industrial': Shield,
  'funeral-services': Briefcase,
  'retail-trade': Store,
  'agriculture-garden': Sprout,
};

const SECTOR_COLORS: Record<string, string> = {
  'real-estate-facility': '#3b82f6',
  'home-personal-services': '#10b981',
  'trades-construction': '#f97316',
  'tech-digital': '#06b6d4',
  'transport-logistics': '#ef4444',
  'professional-legal-finance': '#6366f1',
  'health-beauty': '#ec4899',
  'creative-media': '#a855f7',
  'education-coaching': '#14b8a6',
  'food-hospitality': '#eab308',
  'events-services': '#f43f5e',
  'crafts-repair': '#78716c',
  'pets-services': '#84cc16',
  'travel-tourism': '#0ea5e9',
  'security-industrial': '#64748b',
  'funeral-services': '#57534e',
  'retail-trade': '#8b5cf6',
  'agriculture-garden': '#22c55e',
};

const DEFAULT_ICON = ShoppingBag;
const DEFAULT_COLOR = '#6b7280';

export function getOccupationSectorIcon(slug: string): ElementType {
  return SECTOR_ICONS[slug] ?? DEFAULT_ICON;
}

export function getOccupationSectorColor(slug: string): string {
  return SECTOR_COLORS[slug] ?? DEFAULT_COLOR;
}

function jobNode(job: BusinessOccupation, sectorSlug: string, sectorColor: string): OccupationMegaMenuNode {
  return {
    id: job.slug,
    slug: job.slug,
    name: job.title,
    label: job.title,
    value: job.slug,
    icon: getOccupationJobIcon(job.slug),
    color: sectorColor,
    parent: sectorSlug,
    pickable: true,
  };
}

function sectorNode(sector: BusinessOccupation, jobs: BusinessOccupation[]): OccupationMegaMenuNode {
  const color = getOccupationSectorColor(sector.slug);
  const Icon = getOccupationSectorIcon(sector.slug);
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
    subCategories: jobs.map((j) => jobNode(j, sector.slug, color)),
  };
}

/** Sector roots with sorted job children for mega menu. */
export function buildOccupationMegaMenuTree(): OccupationMegaMenuNode[] {
  const sectors = getOccupationSectors();
  const jobs = getPickableOccupations();

  return sectors
    .map((sector) => {
      const sectorJobs = jobs
        .filter((j) => j.parentSlug === sector.slug)
        .sort(compareOccupationsByDisplayOrder);
      return sectorNode(sector, sectorJobs);
    })
    .filter((s) => (s.subCategories?.length ?? 0) > 0);
}

/** Current tree from sync cache (defaults until warmed). */
export function getOccupationMegaMenuTree(): OccupationMegaMenuNode[] {
  return buildOccupationMegaMenuTree();
}

/** @deprecated Use getOccupationMegaMenuTree() — built at module load from defaults. */
export const OCCUPATION_MEGA_MENU_TREE = buildOccupationMegaMenuTree();

function collectMenuJobs(tree: OccupationMegaMenuNode[]): OccupationMegaMenuNode[] {
  const out: OccupationMegaMenuNode[] = [];
  for (const sector of tree) {
    for (const job of sector.subCategories ?? []) {
      out.push(job);
    }
  }
  return out;
}

/** Flat pickable jobs for search. */
export function getAllOccupationMenuJobs(
  tree: OccupationMegaMenuNode[] = getOccupationMegaMenuTree()
): OccupationMegaMenuNode[] {
  return collectMenuJobs(tree);
}

export function filterOccupationMegaMenu(
  query: string,
  tree: OccupationMegaMenuNode[] = getOccupationMegaMenuTree()
): { sectors: OccupationMegaMenuNode[]; flatJobs: OccupationMegaMenuNode[] } {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { sectors: tree, flatJobs: [] };
  }

  const flatJobs = getAllOccupationMenuJobs(tree).filter(
    (j) => j.name.includes(query.trim()) || j.slug.includes(q)
  );

  const sectorSlugs = new Set(flatJobs.map((j) => j.parent).filter(Boolean));
  const sectors = tree.filter((s) => sectorSlugs.has(s.slug)).map((sector) => ({
    ...sector,
    subCategories: (sector.subCategories ?? []).filter((j) =>
      flatJobs.some((f) => f.slug === j.slug)
    ),
  }));

  return { sectors, flatJobs };
}
