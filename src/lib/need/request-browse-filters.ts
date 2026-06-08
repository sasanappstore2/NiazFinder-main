import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { buildGeoAndFilters } from '@/lib/search/geo-api-filters';
import { resolveNeighborhoodSlugs } from '@/lib/neighborhoods/server';
import { buildNeighborhoodWhereClauses } from '@/lib/neighborhoods/tokens';
import {
  RESERVED_BROWSE_PARAMS,
  parseRangeShorthand,
  RANGE_PARAM_MAP,
} from '@/config/category-filters/attr-params';

function recentCutoff(recent: string): Date | null {
  const now = Date.now();
  if (recent === '24h') return new Date(now - 24 * 60 * 60 * 1000);
  if (recent === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (recent === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return null;
}

export type RequestBrowseFilterInput = {
  category?: string;
  search?: string;
  citiesParam?: string;
  provincesParam?: string;
  legacyCity?: string;
  legacyProvince?: string;
  neighborhoodsParam?: string;
  neighborhoodCityId?: string;
  budgetMin?: string;
  budgetMax?: string;
  priority?: string;
  hasPhoto?: boolean;
  recent?: string;
  searchParams?: URLSearchParams;
};

export async function buildRequestBrowseAndFilters(
  input: RequestBrowseFilterInput
): Promise<Prisma.ServiceRequestWhereInput[]> {
  const andFilters: Prisma.ServiceRequestWhereInput[] = [];

  if (input.category) {
    const category = await db.category.findFirst({
      where: {
        OR: [{ id: input.category }, { slug: input.category }],
      },
      include: { children: { select: { id: true } } },
    });
    if (category) {
      const categoryIds = [category.id, ...category.children.map((c) => c.id)];
      andFilters.push({
        OR: [{ categoryId: { in: categoryIds } }, { subcategoryId: { in: categoryIds } }],
      });
    } else {
      andFilters.push({ categoryId: { in: [] } });
    }
  }

  andFilters.push(
    ...buildGeoAndFilters({
      citiesParam: input.citiesParam,
      provincesParam: input.provincesParam,
      legacyCity: input.legacyCity,
      legacyProvince: input.legacyProvince,
    })
  );

  if (input.neighborhoodsParam && input.neighborhoodCityId) {
    const slugs = input.neighborhoodsParam
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (slugs.length > 0) {
      const resolved = await resolveNeighborhoodSlugs(input.neighborhoodCityId, slugs);
      if (resolved.length > 0) {
        andFilters.push(...buildNeighborhoodWhereClauses(resolved));
      }
    }
  }

  if (input.budgetMin) {
    const n = Number(input.budgetMin);
    if (!Number.isNaN(n)) {
      andFilters.push({ OR: [{ budgetMin: { gte: n } }, { budgetMax: { gte: n } }] });
    }
  }
  if (input.budgetMax) {
    const n = Number(input.budgetMax);
    if (!Number.isNaN(n)) {
      andFilters.push({
        OR: [{ budgetMin: { lte: n } }, { budgetMax: { lte: n } }, { budgetMin: null }],
      });
    }
  }

  if (input.priority && ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(input.priority)) {
    andFilters.push({ priority: input.priority as Prisma.EnumPriorityFilter['equals'] });
  }

  if (input.hasPhoto) {
    andFilters.push({ NOT: { attachmentUrls: '[]' } });
  }

  const recentDate = input.recent ? recentCutoff(input.recent) : null;
  if (recentDate) {
    andFilters.push({ createdAt: { gte: recentDate } });
  }

  if (input.searchParams) {
    for (const key of input.searchParams.keys()) {
      if (RESERVED_BROWSE_PARAMS.has(key)) continue;
      const raw = input.searchParams.get(key);
      if (!raw?.trim()) continue;
      if (RANGE_PARAM_MAP[key]) continue;
      if (key.endsWith('Min') || key.endsWith('Max')) continue;
      andFilters.push({ dynamicAnswers: { contains: `"${key}":"${raw.trim()}"` } });
    }
  }

  if (input.search?.trim()) {
    andFilters.push({
      OR: [
        { title: { contains: input.search.trim() } },
        { description: { contains: input.search.trim() } },
      ],
    });
  }

  return andFilters;
}
