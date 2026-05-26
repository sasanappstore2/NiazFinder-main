import { db } from '@/lib/db';
import {
  legacyValueToSlug,
  resolveCategoryLevels,
} from '@/config/categories';

export interface ResolvedCategoryIds {
  categoryId: string;
  subcategoryId: string | null;
  categorySlug: string;
  subcategorySlug: string | null;
}

async function findCategoryIdBySlug(slug: string): Promise<string | null> {
  const row = await db.category.findFirst({
    where: { slug, isActive: true },
    select: { id: true },
  });
  return row?.id ?? null;
}

/**
 * Resolve Prisma category + subcategory ids from canonical or legacy slugs.
 */
export async function resolveCategoryIds(
  categorySlug: string,
  subcategorySlug?: string | null
): Promise<ResolvedCategoryIds> {
  const levels = resolveCategoryLevels(categorySlug, subcategorySlug);
  if (!levels) {
    const fallback = await db.category.findFirst({
      where: { isActive: true, parentId: null },
      orderBy: { order: 'asc' },
    });
    if (!fallback) throw new Error('No active category in database');
    return {
      categoryId: fallback.id,
      subcategoryId: null,
      categorySlug: fallback.slug,
      subcategorySlug: null,
    };
  }

  let categoryId = await findCategoryIdBySlug(levels.categorySlug);
  let subcategoryId: string | null = null;

  if (levels.subcategorySlug) {
    subcategoryId = await findCategoryIdBySlug(levels.subcategorySlug);
    if (!categoryId) {
      categoryId = subcategoryId;
      subcategoryId = null;
    }
  }

  if (!categoryId) {
    const leafId = await findCategoryIdBySlug(levels.leafSlug);
    if (leafId) {
      categoryId = leafId;
    }
  }

  if (!categoryId) {
    const any = await db.category.findFirst({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    if (!any) throw new Error('No active category in database');
    categoryId = any.id;
  }

  return {
    categoryId,
    subcategoryId,
    categorySlug: levels.categorySlug,
    subcategorySlug: levels.subcategorySlug,
  };
}

/** @deprecated Use resolveCategoryIds */
export async function resolveCategoryId(categorySlug: string): Promise<string> {
  const { categoryId } = await resolveCategoryIds(categorySlug);
  return categoryId;
}

/** Resolve slug from URL query (?category= legacy or canonical). */
export function resolveSlugFromQuery(categoryParam: string): string | null {
  return legacyValueToSlug(categoryParam) ?? categoryParam;
}
