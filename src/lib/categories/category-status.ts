import type { CategoryStatus, Prisma } from '@prisma/client';
import { getCategoryPath } from '@/config/categories';

export const CATEGORY_STATUSES: readonly CategoryStatus[] = ['ACTIVE', 'DISABLED', 'COMING_SOON'];

/** Public marketplace: only ACTIVE categories are usable and visible. */
export function isCategoryAvailable(status: CategoryStatus): boolean {
  return status === 'ACTIVE';
}

/** Prisma filter for public category queries — backend source of truth. */
export function getPublicCategoryWhere(
  extra?: Prisma.CategoryWhereInput
): Prisma.CategoryWhereInput {
  return {
    status: 'ACTIVE',
    ...extra,
  };
}

export function parseCategoryStatus(value: unknown): CategoryStatus | null {
  if (value === 'ACTIVE' || value === 'DISABLED' || value === 'COMING_SOON') {
    return value;
  }
  return null;
}

/** Launch policy: real-estate subtree ACTIVE, all other canonical roots DISABLED. */
export function getLaunchStatusForSlug(slug: string): CategoryStatus {
  const path = getCategoryPath(slug);
  if (path.length === 0) return 'DISABLED';
  return path[0]?.slug === 'real-estate' ? 'ACTIVE' : 'DISABLED';
}

export class CategoryNotAvailableError extends Error {
  readonly statusCode = 403;

  constructor(
    public readonly slug: string,
    public readonly status: CategoryStatus | null
  ) {
    super(
      status === 'COMING_SOON'
        ? `دسته «${slug}» به‌زودی فعال می‌شود.`
        : `دسته «${slug}» در حال حاضر غیرفعال است.`
    );
    this.name = 'CategoryNotAvailableError';
  }
}

export function assertCategoryAvailable(
  slug: string,
  status: CategoryStatus | null | undefined
): void {
  if (!status || !isCategoryAvailable(status)) {
    throw new CategoryNotAvailableError(slug, status ?? null);
  }
}
