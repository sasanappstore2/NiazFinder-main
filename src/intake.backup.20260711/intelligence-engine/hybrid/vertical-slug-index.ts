import { CANONICAL_CATEGORIES, getCategoryPath } from '@/config/categories';
import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';

/** Roots under each classifier vertical (products spans multiple category roots). */
const VERTICAL_ROOT_SLUGS: Record<ClassifierVertical, readonly string[]> = {
  'real-estate': ['real-estate'],
  vehicles: ['vehicles'],
  products: ['electronics', 'home-appliances', 'personal-items', 'entertainment'],
  services: ['services'],
  jobs: ['jobs'],
  social: ['social'],
};

let leafSlugsByVertical: Map<ClassifierVertical, Set<string>> | null = null;

function buildVerticalIndex(): Map<ClassifierVertical, Set<string>> {
  const map = new Map<ClassifierVertical, Set<string>>();
  for (const vertical of Object.keys(VERTICAL_ROOT_SLUGS) as ClassifierVertical[]) {
    map.set(vertical, new Set());
  }

  for (const cat of CANONICAL_CATEGORIES) {
    const path = getCategoryPath(cat.slug);
    const root = path[0]?.slug;
    if (!root) continue;

    for (const [vertical, roots] of Object.entries(VERTICAL_ROOT_SLUGS) as [
      ClassifierVertical,
      readonly string[],
    ][]) {
      if (!roots.includes(root)) continue;
      map.get(vertical)!.add(cat.slug);
    }
  }

  return map;
}

export function getLeafSlugsForVertical(vertical: ClassifierVertical): Set<string> {
  if (!leafSlugsByVertical) {
    leafSlugsByVertical = buildVerticalIndex();
  }
  return leafSlugsByVertical.get(vertical) ?? new Set();
}

export function slugBelongsToVertical(slug: string, vertical: ClassifierVertical): boolean {
  const allowed = getLeafSlugsForVertical(vertical);
  if (allowed.has(slug)) return true;

  const path = getCategoryPath(slug);
  const root = path[0]?.slug;
  if (!root) return false;
  return VERTICAL_ROOT_SLUGS[vertical].includes(root);
}

export function slugBelongsToAnyVertical(
  slug: string,
  verticals: readonly ClassifierVertical[]
): boolean {
  return verticals.some((v) => slugBelongsToVertical(slug, v));
}

export function rootsForVertical(vertical: ClassifierVertical): readonly string[] {
  return VERTICAL_ROOT_SLUGS[vertical];
}
