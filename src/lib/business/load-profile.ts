import { db } from '@/lib/db';
import { mapProfileToBusiness } from '@/lib/business/map-profile';
import {
  ensureBusinessProfile,
  seedOffersFromSkills,
  seedPortfolioFromLegacy,
  seedReviewsFromLegacy,
} from '@/lib/business/ensure-profile';
import type { Business } from '@/contracts/business-profile';

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

export async function loadBusinessByUserId(userId: string): Promise<Business | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;

  const profile = await ensureBusinessProfile(user);
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

  if (!profile || !profile.user.isActive) return null;
  return hydrateAndMap(profile.id, profile.userId, city, category);
}

export async function loadBusinessByProfileSlug(slug: string): Promise<Business | null> {
  const profile = await db.businessProfile.findUnique({
    where: { slug },
    include: profileInclude,
  });
  if (!profile || !profile.user.isActive) return null;
  return hydrateAndMap(profile.id, profile.userId);
}

export async function incrementBusinessView(userId: string) {
  await db.businessProfile.updateMany({
    where: { userId },
    data: { viewCount: { increment: 1 } },
  });
}

export async function listBusinesses(opts: {
  city?: string;
  category?: string;
  minRating?: number;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 12));
  const skip = (page - 1) * limit;

  const where: {
    status: 'ACTIVE';
    city?: { contains: string };
    rating?: { gte: number };
    categorySlugs?: { contains: string };
  } = { status: 'ACTIVE' };

  if (opts.city) where.city = { contains: opts.city };
  if (opts.minRating) where.rating = { gte: opts.minRating };
  if (opts.category) where.categorySlugs = { contains: `"${opts.category}"` };

  const [rows, total] = await Promise.all([
    db.businessProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ verified: 'desc' }, { rating: 'desc' }],
      include: { user: { select: { id: true, avatar: true, isVerified: true } } },
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
      category: JSON.parse(p.categorySlugs || '[]') as string[],
      rating: p.rating,
      reviewCount: p.reviewCount,
      verified: p.verified || p.user.isVerified,
      tags: JSON.parse(p.tags || '[]') as string[],
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
