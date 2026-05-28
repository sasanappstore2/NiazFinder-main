import { normalizeCategoryPair } from '@/config/categories';
import {
  ALL_CATEGORIES,
  type MegaMenuCategory,
} from '@/components/navigation/MegaMenu/CategoryMegaMenu';
import { resolveMegaMenuCategorySlug } from '@/lib/search/category-browse-url';

function walkMegaMenu(
  nodes: MegaMenuCategory[],
  visit: (node: MegaMenuCategory, path: MegaMenuCategory[]) => MegaMenuCategory | null,
  path: MegaMenuCategory[] = []
): MegaMenuCategory | null {
  for (const node of nodes) {
    const nextPath = [...path, node];
    const hit = visit(node, nextPath);
    if (hit) return hit;
    if (node.subCategories?.length) {
      const nested = walkMegaMenu(node.subCategories, visit, nextPath);
      if (nested) return nested;
    }
  }
  return null;
}

export function findMegaMenuCategoryForSlug(slug: string): MegaMenuCategory | null {
  const normalized = normalizeCategoryPair(slug);
  const targets = new Set(
    [slug, normalized.categorySlug, normalized.subcategorySlug].filter(Boolean) as string[]
  );

  return walkMegaMenu(ALL_CATEGORIES, (node) => {
    const canonical = resolveMegaMenuCategorySlug(node);
    if (canonical && targets.has(canonical)) return node;
    if (targets.has(node.id) || targets.has(node.value)) return node;
    return null;
  });
}

export function getMegaMenuBreadcrumb(category: MegaMenuCategory): string {
  const path: MegaMenuCategory[] = [];
  walkMegaMenu(ALL_CATEGORIES, (node, ancestors) => {
    if (node.id === category.id) {
      path.push(...ancestors, node);
      return node;
    }
    return null;
  });
  return path.map((n) => n.name).join(' / ') || category.name;
}

export function resolveIntakeCategoryFromMegaMenu(category: MegaMenuCategory): {
  slug: string;
  categorySlug: string;
  subcategorySlug: string | null;
  label: string;
} | null {
  const slug = resolveMegaMenuCategorySlug(category);
  if (!slug) return null;
  const normalized = normalizeCategoryPair(slug);
  return {
    slug,
    categorySlug: normalized.categorySlug,
    subcategorySlug: normalized.subcategorySlug ?? null,
    label: getMegaMenuBreadcrumb(category),
  };
}
