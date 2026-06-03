import type { ServiceRequest, Category } from '@prisma/client';
import {
  RESERVED_BROWSE_PARAMS,
  parseRangeShorthand,
  RANGE_PARAM_MAP,
} from '@/config/category-filters/attr-params';
import type { BrowseFilters, RecentWindow } from '@/lib/filters/parser';
import { citySlugToPersianName } from '@/lib/search/city-slugs';
import { provinceSlugsToPersianNames } from '@/lib/search/province-slugs';
import {
  matchesDynamicAnswers,
  matchesNumericRanges,
} from '@/lib/filters/dynamic-answers-filter';

type RequestForMatch = Pick<
  ServiceRequest,
  | 'title'
  | 'description'
  | 'city'
  | 'province'
  | 'budgetMin'
  | 'budgetMax'
  | 'priority'
  | 'dynamicAnswers'
  | 'attachmentUrls'
  | 'createdAt'
  | 'categoryId'
  | 'subcategoryId'
> & {
  category?: Pick<Category, 'slug' | 'id'> | null;
  subcategory?: Pick<Category, 'slug' | 'id'> | null;
};

export interface AlertMatchContext {
  categorySlug?: string | null;
  categoryIds?: string[];
  citySlugs: string[];
  filters: Partial<BrowseFilters>;
  searchQuery?: string | null;
}

function recentCutoff(recent: RecentWindow): Date {
  const now = Date.now();
  if (recent === '24h') return new Date(now - 24 * 60 * 60 * 1000);
  if (recent === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
  return new Date(now - 30 * 24 * 60 * 60 * 1000);
}

function collectAttrMatchers(filters: Partial<BrowseFilters>) {
  const exact: Record<string, string> = { ...(filters.attributes ?? {}) };
  const ranges: { key: string; min?: number; max?: number }[] = [];

  if (filters.priceMin != null || filters.priceMax != null) {
    // budget handled separately
  }

  for (const [rangeParam, map] of Object.entries(RANGE_PARAM_MAP)) {
    const min = filters.attributes?.[map.minKey];
    const max = filters.attributes?.[map.maxKey];
    if (min || max) {
      const parsed = parseRangeShorthand(rangeParam, `${min ?? ''}-${max ?? ''}`);
      for (const [attrKey, val] of Object.entries(parsed)) {
        const n = Number(val);
        if (Number.isNaN(n)) continue;
        const entry = ranges.find((r) => r.key === attrKey) ?? { key: attrKey };
        if (attrKey.endsWith('Min')) entry.min = n;
        if (attrKey.endsWith('Max')) entry.max = n;
        if (!ranges.includes(entry)) ranges.push(entry);
      }
    }
  }

  return { exact, ranges };
}

function budgetToNumber(value: bigint | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function requestMatchesBrowseAlert(
  request: RequestForMatch,
  ctx: AlertMatchContext
): boolean {
  const filters = ctx.filters;
  const q = (ctx.searchQuery ?? filters.q ?? '').trim();

  if (q) {
    const hay = `${request.title} ${request.description}`.toLowerCase();
    if (!hay.includes(q.toLowerCase())) return false;
  }

  if (ctx.categorySlug) {
    const slugs = new Set(
      [request.category?.slug, request.subcategory?.slug].filter(Boolean) as string[]
    );
    if (ctx.categoryIds?.length) {
      const ids = new Set([request.categoryId, request.subcategoryId].filter(Boolean));
      const idMatch = ctx.categoryIds.some((id) => ids.has(id));
      const slugMatch = slugs.has(ctx.categorySlug);
      if (!idMatch && !slugMatch) return false;
    } else if (!slugs.has(ctx.categorySlug)) {
      return false;
    }
  }

  if (ctx.citySlugs.length > 0) {
    const names = ctx.citySlugs
      .map((s) => citySlugToPersianName(s))
      .filter(Boolean) as string[];
    if (names.length > 0) {
      const city = request.city ?? '';
      if (!names.some((n) => city.includes(n))) return false;
    }
  } else if (filters.cities?.length) {
    const names = filters.cities
      .map((s) => citySlugToPersianName(s) ?? s)
      .filter(Boolean);
    if (names.length > 0) {
      const city = request.city ?? '';
      if (!names.some((n) => city.includes(n))) return false;
    }
  }

  if (filters.provinces?.length) {
    const provinceNames = provinceSlugsToPersianNames(filters.provinces);
    if (provinceNames.length > 0) {
      const prov = request.province ?? '';
      if (!provinceNames.some((n) => prov.includes(n))) return false;
    }
  }

  if (filters.priceMin != null) {
    const max = budgetToNumber(request.budgetMax);
    const min = budgetToNumber(request.budgetMin);
    const reqHigh = max ?? min;
    if (reqHigh == null || reqHigh < filters.priceMin) return false;
  }
  if (filters.priceMax != null) {
    const min = budgetToNumber(request.budgetMin);
    if (min != null && min > filters.priceMax) return false;
  }

  if (filters.urgent && request.priority !== 'URGENT') return false;

  if (filters.hasPhoto) {
    const urls = request.attachmentUrls?.trim() ?? '[]';
    if (urls === '[]' || urls === '') return false;
  }

  if (filters.recent) {
    const cutoff = recentCutoff(filters.recent);
    if (request.createdAt < cutoff) return false;
  }

  const { exact, ranges } = collectAttrMatchers(filters);
  const dyn = request.dynamicAnswers ?? '{}';
  if (!matchesDynamicAnswers(dyn, exact)) return false;
  if (!matchesNumericRanges(dyn, ranges)) return false;

  return true;
}

/** Build URLSearchParams-like keys from stored filters for reserved param skip (export for tests). */
export function isReservedBrowseParam(key: string): boolean {
  return RESERVED_BROWSE_PARAMS.has(key);
}
