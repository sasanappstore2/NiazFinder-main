import { db } from '@/lib/db';
import {
  legacyValueToSlug,
  resolveCategoryLevels,
} from '@/config/categories';
import {
  assertCategoryAvailable,
  getPublicCategoryWhere,
} from '@/lib/categories/category-status';

export interface ResolvedCategoryIds {
  categoryId: string;
  subcategoryId: string | null;
  categorySlug: string;
  subcategorySlug: string | null;
}

export class CategoryResolveError extends Error {
  readonly statusCode = 422;

  constructor(
    public readonly slug: string,
    message?: string
  ) {
    super(
      message ??
        `دسته «${slug}» در پایگاه داده یافت نشد. دستور npm run categories:sync را اجرا کنید.`
    );
    this.name = 'CategoryResolveError';
  }
}

async function findCategoryIdBySlug(slug: string): Promise<string | null> {
  const row = await db.category.findFirst({
    where: getPublicCategoryWhere({ slug }),
    select: { id: true, status: true },
  });
  if (row) return row.id;

  const inactive = await db.category.findFirst({
    where: { slug },
    select: { status: true },
  });
  if (inactive) {
    assertCategoryAvailable(slug, inactive.status);
  }
  return null;
}

function missingSlug(slug: string): never {
  throw new CategoryResolveError(slug);
}

/**
 * Resolve Prisma category + subcategory ids from canonical or legacy slugs.
 * Fails loudly when slug is unknown in DB (no silent fallback).
 */
export async function resolveCategoryIds(
  categorySlug: string,
  subcategorySlug?: string | null
): Promise<ResolvedCategoryIds> {
  const levels = resolveCategoryLevels(categorySlug, subcategorySlug);
  if (!levels) {
    missingSlug(categorySlug);
  }

  let categoryId = await findCategoryIdBySlug(levels.categorySlug);
  let subcategoryId: string | null = null;

  if (levels.subcategorySlug) {
    subcategoryId = await findCategoryIdBySlug(levels.subcategorySlug);
    if (!categoryId && subcategoryId) {
      categoryId = subcategoryId;
      subcategoryId = null;
    }
  }

  if (!categoryId) {
    categoryId = await findCategoryIdBySlug(levels.leafSlug);
  }

  if (!categoryId) {
    missingSlug(levels.leafSlug);
  }

  if (levels.subcategorySlug && !subcategoryId) {
    const leafOnly = await findCategoryIdBySlug(levels.subcategorySlug);
    if (leafOnly) subcategoryId = leafOnly;
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
