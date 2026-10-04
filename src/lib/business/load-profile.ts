import type { BusinessProfile } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { mapProfileToBusiness } from '@/lib/business/map-profile';
import {
  ensureBusinessProfile,
  seedOffersFromSkills,
  seedPortfolioFromLegacy,
  seedReviewsFromLegacy,
} from '@/lib/business/ensure-profile';
import { buildBusinessGeoWhere } from '@/lib/business/browse-geo-filters';
import { resolveNeighborhoodSlugs } from '@/lib/neighborhoods/server';
import { buildNeighborhoodWhereClauses } from '@/lib/neighborhoods/tokens';
import {
  categoryFilterToPrismaWhere,
  resolveBrowseCategoryFilter,
} from '@/lib/business/resolve-browse-category-filter';
import { searchBusinessProfilesTypesense } from '@/lib/search/typesense-business-search';
import type { Business } from '@/contracts/business-profile';
import {
  isPublicBusinessProfile,
  type ProfileWithUserActive,
} from '@/lib/business/public-profile';

export { isPublicBusinessProfile } from '@/lib/business/public-profile';

const profileInclude = {
  offers: { where: { isPublished: true }, orderBy: { order: 'asc' as const } },
  portfolioItems: { where: { isPublished: true }, orderBy: { order: 'asc' as const } },
  profileReviews: { where: { isPublished: true }, orderBy: { createdAt: 'desc' as const } },
  user: {
    select: {
      id: true,
      avatar: true,
      isVerified: true,
      phone: true,
      email: true,
      online: true,
      role: true,
      isActive: true,
    },
  },
};

async function hydrateAndMap(
  profileId: string,
  userId: string,
  citySlug?: string,
  category?: string
): Promise<Business | null> {
  await Promise.all([
    seedOffersFromSkills(profileId, userId),
    seedPortfolioFromLegacy(profileId, userId),
    seedReviewsFromLegacy(profileId, userId),
  ]);

  const profile = await db.businessProfile.findUnique({
    where: { id: profileId },
    include: profileInclude,
  });

  if (!profile || !profile.user.isActive) return null;
  return mapProfileToBusiness(profile, citySlug, category);
}

/** Resolve `/pro/{id}` — id may be profile slug or legacy userId. */
export async function loadBusinessForProRoute(id: string): Promise<Business | null> {
  const bySlug = await loadBusinessByProfileSlug(id);
  if (bySlug) return bySlug;
  return loadBusinessByUserId(id);
}

export async function loadBusinessByUserId(userId: string): Promise<Business | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;

  const profile = await ensureBusinessProfile(user);
  if (profile.status !== 'ACTIVE') return null;
  return hydrateAndMap(profile.id, user.id);
}

export async function loadBusinessBySlug(
  city: string,
  category: string,
  slug: string
): Promise<Business | null> {
  const profile = await db.businessProfile.findFirst({
    where: { slug, status: 'ACTIVE' },
    include: profileInclude,
  });

  if (!profile || !isPublicBusinessProfile(profile)) return null;
  return hydrateAndMap(profile.id, profile.userId, city, category);
}

export async function loadBusinessByProfileSlug(slug: string): Promise<Business | null> {
  const profile = await db.businessProfile.findUnique({
    where: { slug },
    include: profileInclude,
  });
  if (!profile || !isPublicBusinessProfile(profile)) return null;
  return hydrateAndMap(profile.id, profile.userId);
}

export async function incrementBusinessView(userId: string) {
  await db.businessProfile.updateMany({
    where: { userId, status: 'ACTIVE' },
    data: { viewCount: { increment: 1 } },
  });
}

export type BusinessBrowseSort = 'rating' | 'newest' | 'name' | 'popular';

export async function listBusinesses(opts: {
  city?: string;
  citiesParam?: string;
  provincesParam?: string;
  neighborhoodsParam?: string;
  neighborhoodCityId?: string;
  category?: string;
  search?: string;
  verified?: boolean;
  sort?: BusinessBrowseSort;
  minRating?: number;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}) {
  const useNeighborhoodFilter = Boolean(
    opts.neighborhoodsParam?.trim() && opts.neighborhoodCityId
  );

  if (!useNeighborhoodFilter) {
    const typesenseResult = await searchBusinessProfilesTypesense({
      search: opts.search,
      category: opts.category,
      citiesParam: opts.citiesParam,
      provincesParam: opts.provincesParam,
      legacyCity: opts.city,
      verified: opts.verified,
      sort: opts.sort,
      minRating: opts.minRating,
      page: opts.page,
      limit: opts.limit,
      lat: opts.lat,
      lng: opts.lng,
      radiusKm: opts.radiusKm,
    });
    if (typesenseResult) {
      return typesenseResult;
    }
  }

  return listBusinessesFromDb(opts);
}

async function listBusinessesFromDb(opts: {
  city?: string;
  citiesParam?: string;
  provincesParam?: string;
  neighborhoodsParam?: string;
  neighborhoodCityId?: string;
  category?: string;
  search?: string;
  verified?: boolean;
  sort?: BusinessBrowseSort;
  minRating?: number;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 12));
  const skip = (page - 1) * limit;

  const and: Prisma.BusinessProfileWhereInput[] = [
    { status: 'ACTIVE' },
    { user: { isActive: true } },
  ];

  const geoClauses = buildBusinessGeoWhere({
    citiesParam: opts.citiesParam,
    provincesParam: opts.provincesParam,
    legacyCity: opts.city,
  });
  and.push(...geoClauses);

  if (opts.neighborhoodsParam && opts.neighborhoodCityId) {
    const slugs = opts.neighborhoodsParam
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (slugs.length > 0) {
      const resolved = await resolveNeighborhoodSlugs(opts.neighborhoodCityId, slugs);
      if (resolved.length > 0) {
        and.push(...buildNeighborhoodWhereClauses(resolved));
      }
    }
  }

  const categoryWhere = categoryFilterToPrismaWhere(
    resolveBrowseCategoryFilter(opts.category)
  );
  if (categoryWhere) and.push(categoryWhere);

  if (opts.minRating) and.push({ rating: { gte: opts.minRating } });
  if (opts.verified) and.push({ verified: true });

  if (
    opts.lat !== undefined &&
    opts.lng !== undefined &&
    opts.radiusKm !== undefined &&
    Number.isFinite(opts.lat) &&
    Number.isFinite(opts.lng) &&
    opts.radiusKm > 0
  ) {
    const latDelta = opts.radiusKm / 111;
    const lngDelta = opts.radiusKm / (111 * Math.cos((opts.lat * Math.PI) / 180));
    and.push({
      lat: { gte: opts.lat - latDelta, lte: opts.lat + latDelta },
      lng: { gte: opts.lng - lngDelta, lte: opts.lng + lngDelta },
    });
  }

  const q = opts.search?.trim();
  if (q) {
    and.push({
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
        { tags: { contains: q } },
        { categorySlugs: { contains: q } },
      ],
    });
  }

  const where: Prisma.BusinessProfileWhereInput =
    and.length === 1 ? and[0]! : { AND: and };

  const orderBy: Prisma.BusinessProfileOrderByWithRelationInput[] = (() => {
    switch (opts.sort) {
      case 'newest':
        return [{ createdAt: 'desc' }];
      case 'name':
        return [{ name: 'asc' }];
      case 'popular':
        return [{ viewCount: 'desc' }, { rating: 'desc' }];
      case 'rating':
      default:
        return [{ verified: 'desc' }, { rating: 'desc' }];
    }
  })();

  const [rows, total] = await Promise.all([
    db.businessProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            avatar: true,
            isVerified: true,
            online: true,
            createdAt: true,
          },
        },
      },
    }),
    db.businessProfile.count({ where }),
  ]);

  return {
    data: rows.map((p) => ({
      id: p.userId,
      slug: p.slug,
      name: p.name,
      logo: p.logo ?? p.user.avatar ?? undefined,
      city: p.city ?? '',
      province: p.province ?? '',
      category: JSON.parse(p.categorySlugs || '[]') as string[],
      rating: p.rating,
      reviewCount: p.reviewCount,
      verified: p.verified || p.user.isVerified,
      tags: JSON.parse(p.tags || '[]') as string[],
      online: p.user.online,
      createdAt: p.createdAt.toISOString(),
      description: p.description ?? undefined,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}
