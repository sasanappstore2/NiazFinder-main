import { db } from '@/lib/db';
import { cityNamesFromParam } from '@/lib/business/browse-geo-filters';
import { provinceSlugsToPersianNames } from '@/lib/search/province-slugs';
import { resolveBrowseCategoryFilter } from '@/lib/business/resolve-browse-category-filter';
import type { BusinessBrowseSort } from '@/lib/business/load-profile';
import {
  BUSINESS_PROFILES_COLLECTION,
  getTypesenseClient,
  isTypesenseHealthy,
  typesenseEnabled,
} from '@/lib/search/typesense-client';
import type { BusinessProfileSearchDocument } from '@/lib/search/typesense-business-index';

export type TypesenseBusinessSearchInput = {
  search?: string;
  category?: string;
  citiesParam?: string;
  provincesParam?: string;
  legacyCity?: string;
  verified?: boolean;
  sort?: BusinessBrowseSort;
  minRating?: number;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

export type TypesenseBusinessSearchResult = {
  data: Array<{
    id: string;
    slug: string;
    name: string;
    logo?: string;
    city: string;
    province: string;
    category: string[];
    rating: number;
    reviewCount: number;
    verified: boolean;
    tags: string[];
    online?: boolean;
    createdAt: string;
    description?: string;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

function buildFilterBy(input: TypesenseBusinessSearchInput): string {
  const filters: string[] = [];

  if (input.verified) {
    filters.push('verified:=true');
  }

  if (input.minRating != null && Number.isFinite(input.minRating) && input.minRating > 0) {
    filters.push(`rating:>=${input.minRating}`);
  }

  const categoryFilter = resolveBrowseCategoryFilter(input.category);
  if (categoryFilter.kind === 'single') {
    filters.push(`category:=${escapeFilterValue(categoryFilter.slug)}`);
  } else if (categoryFilter.kind === 'any-of') {
    filters.push(
      `(${categoryFilter.slugs.map((slug) => `category:=${escapeFilterValue(slug)}`).join(' || ')})`
    );
  }

  const cityNames: string[] = [];
  if (input.citiesParam) {
    cityNames.push(...cityNamesFromParam(input.citiesParam));
  } else if (input.legacyCity) {
    cityNames.push(input.legacyCity);
  }
  if (cityNames.length === 1) {
    filters.push(`city:=${escapeFilterValue(cityNames[0]!)}`);
  } else if (cityNames.length > 1) {
    filters.push(
      `(${cityNames.map((name) => `city:=${escapeFilterValue(name)}`).join(' || ')})`
    );
  }

  const provinceNames: string[] = [];
  if (input.provincesParam) {
    const slugs = input.provincesParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    provinceNames.push(...provinceSlugsToPersianNames(slugs));
  }
  if (provinceNames.length === 1) {
    filters.push(`province:=${escapeFilterValue(provinceNames[0]!)}`);
  } else if (provinceNames.length > 1) {
    filters.push(
      `(${provinceNames.map((name) => `province:=${escapeFilterValue(name)}`).join(' || ')})`
    );
  }

  if (
    input.lat !== undefined &&
    input.lng !== undefined &&
    input.radiusKm !== undefined &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng) &&
    input.radiusKm > 0
  ) {
    const radiusMeters = Math.round(input.radiusKm * 1000);
    filters.push(`location:(${input.lat}, ${input.lng}, ${radiusMeters} m)`);
  }

  return filters.join(' && ');
}

function escapeFilterValue(value: string): string {
  return `\`${value.replace(/`/g, '\\`')}\``;
}

function sortBy(input: TypesenseBusinessSearchInput): string {
  const geo =
    input.lat !== undefined &&
    input.lng !== undefined &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
      ? `location(${input.lat}, ${input.lng}):asc,`
      : '';

  switch (input.sort) {
    case 'newest':
      return `${geo}created_at:desc`;
    case 'name':
      return `${geo}title:asc`;
    case 'popular':
      return `${geo}view_count:desc,rating:desc`;
    case 'rating':
    default:
      return `${geo}verified:desc,rating:desc`;
  }
}

function mapHit(doc: BusinessProfileSearchDocument) {
  return {
    id: doc.user_id,
    slug: doc.slug,
    name: doc.title,
    logo: doc.logo,
    city: doc.city,
    province: doc.province,
    category: doc.category,
    rating: doc.rating,
    reviewCount: doc.review_count,
    verified: doc.verified,
    tags: doc.tags ?? [],
    createdAt: new Date(doc.created_at).toISOString(),
    description: doc.description,
  };
}

export async function searchBusinessProfilesTypesense(
  input: TypesenseBusinessSearchInput
): Promise<TypesenseBusinessSearchResult | null> {
  if (!typesenseEnabled()) return null;
  if (!(await isTypesenseHealthy())) return null;

  const client = getTypesenseClient();
  if (!client) return null;

  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(50, Math.max(1, input.limit ?? 12));
  const q = input.search?.trim() || '*';
  const filterBy = buildFilterBy(input);

  try {
    const result = await client.collections(BUSINESS_PROFILES_COLLECTION).documents().search({
      q,
      query_by: 'title,category,tags,city,province,description',
      filter_by: filterBy || undefined,
      sort_by: sortBy(input),
      page,
      per_page: limit,
      num_typos: 2,
      typo_tokens_threshold: 1,
      prefix: true,
    });

    const hits = (result.hits ?? []).map((hit) =>
      mapHit(hit.document as BusinessProfileSearchDocument)
    );

    const userIds = hits.map((h) => h.id);
    const users =
      userIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: userIds }, isActive: true },
            select: { id: true, avatar: true, online: true, isVerified: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = hits
      .map((row) => {
        const user = userMap.get(row.id);
        if (!user) return null;
        return {
          ...row,
          logo: row.logo ?? user.avatar ?? undefined,
          verified: row.verified || user.isVerified === true,
          online: user.online,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const total = result.found ?? data.length;
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (err) {
    console.warn('[typesense] business search failed, caller should fall back to DB', err);
    return null;
  }
}
