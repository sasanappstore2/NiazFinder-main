import { db } from '@/lib/db';
import { slugifyBusinessName } from '@/lib/business/slug';
import { uniqueRandomBusinessSlug } from '@/lib/business/profile-slug';
import { parseJsonArray, toJson } from '@/lib/business/json-fields';
import { migrateSlugToOccupation } from '@/config/need-to-occupation-map';
import { isOccupationSlug } from '@/config/business-occupations';
import { queueBusinessProfileSearchSync } from '@/lib/rag/sync';
import type { BusinessProfile, User } from '@prisma/client';
import { Prisma } from '@prisma/client';

type UserForProfile = Pick<
  User,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'displayName'
  | 'avatar'
  | 'bio'
  | 'city'
  | 'province'
  | 'phone'
  | 'email'
  | 'isVerified'
  | 'createdAt'
  | 'role'
> & { address?: string | null };

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
}

function buildProfileData(user: UserForProfile, name: string, slug: string) {
  const yearsActive = Math.max(
    0,
    Math.floor((Date.now() - user.createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  );

  return {
    userId: user.id,
    name,
    slug,
    logo: user.avatar,
    description: user.bio ?? '',
    city: user.city,
    province: user.province,
    address: user.address,
    verified: user.isVerified,
    phone: user.phone,
    email: user.email,
    yearsActive,
    seoTitle: `${name}${user.city ? ` | ${user.city}` : ''}`,
    seoDescription: user.bio?.slice(0, 160) ?? '',
    aiAssistantConfig: toJson({ systemPrompt: '', dynamicQuestions: [] }),
    extensions: toJson({}),
    status: 'INACTIVE' as const,
  };
}

async function slugExists(slug: string): Promise<boolean> {
  const row = await db.businessProfile.findUnique({ where: { slug } });
  return Boolean(row);
}

/** Load or create BusinessProfile from a specialist User (idempotent under concurrency). */
export async function ensureBusinessProfile(user: UserForProfile): Promise<BusinessProfile> {
  const existing = await db.businessProfile.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  const name =
    user.displayName?.trim() ||
    `${user.firstName} ${user.lastName}`.trim() ||
    'کسب‌وکار';

  let slug = await uniqueRandomBusinessSlug(slugExists);
  const data = buildProfileData(user, name, slug);

  try {
    const profile = await db.businessProfile.create({ data });
    await syncCategorySlugsFromSkills(profile.id, user.id);
    const { seedBusinessTeamDefaults } = await import('@/lib/business/team/seed-defaults');
    await seedBusinessTeamDefaults(profile.id, user.id);
    queueBusinessProfileSearchSync(profile.id);
    return profile;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const raced = await db.businessProfile.findUnique({ where: { userId: user.id } });
    if (raced) return raced;

    const target = (error as Prisma.PrismaClientKnownRequestError).meta?.target;
    const fields = Array.isArray(target)
      ? target
      : typeof target === 'string'
        ? [target]
        : [];

    if (fields.some((f) => String(f).includes('slug'))) {
      slug = await uniqueRandomBusinessSlug(slugExists);

      try {
        const profile = await db.businessProfile.create({
          data: buildProfileData(user, name, slug),
        });
        await syncCategorySlugsFromSkills(profile.id, user.id);
        const { seedBusinessTeamDefaults } = await import('@/lib/business/team/seed-defaults');
        await seedBusinessTeamDefaults(profile.id, user.id);
        queueBusinessProfileSearchSync(profile.id);
        return profile;
      } catch (retryError) {
        if (isUniqueConstraintError(retryError)) {
          const final = await db.businessProfile.findUnique({ where: { userId: user.id } });
          if (final) return final;
        }
        throw retryError;
      }
    }

    const final = await db.businessProfile.findUnique({ where: { userId: user.id } });
    if (final) return final;
    throw error;
  }
}

/** Copy category slugs from UserSkill when profile has none (improves need matching). */
export async function syncCategorySlugsFromSkills(profileId: string, userId: string) {
  const profile = await db.businessProfile.findUnique({ where: { id: profileId } });
  if (!profile) return;

  const existing = parseJsonArray<string>(profile.categorySlugs);
  if (existing.length > 0) return;

  const skills = await db.userSkill.findMany({
    where: { userId },
    include: { skill: { include: { category: { select: { slug: true } } } } },
  });

  const slugs = new Set<string>();
  for (const us of skills) {
    const needSlug = us.skill.category?.slug;
    if (!needSlug) continue;
    if (isOccupationSlug(needSlug)) {
      slugs.add(needSlug);
      continue;
    }
    const { occupations, confidence } = migrateSlugToOccupation(needSlug);
    if (confidence !== 'none' && occupations[0]) {
      slugs.add(occupations[0]);
    }
  }

  if (slugs.size === 0) return;

  await db.businessProfile.update({
    where: { id: profileId },
    data: { categorySlugs: toJson([...slugs]) },
  });
  queueBusinessProfileSearchSync(profileId);
}

/** Hydrate offers from user skills when profile has none. */
export async function seedOffersFromSkills(profileId: string, userId: string) {
  const count = await db.businessOffer.count({ where: { profileId } });
  if (count > 0) return;

  const skills = await db.userSkill.findMany({
    where: { userId },
    include: { skill: true },
    take: 8,
  });

  if (skills.length === 0) return;

  await db.businessOffer.createMany({
    data: skills.map((us, i) => ({
      profileId,
      title: us.skill.name,
      description: us.experience ?? `خدمات ${us.skill.name}`,
      ctaType: 'CHAT',
      order: i,
      features: toJson([]),
      images: toJson([]),
      faq: toJson([]),
    })),
  });
}

/** Migrate legacy Portfolio rows into BusinessPortfolioItem. */
export async function seedPortfolioFromLegacy(profileId: string, userId: string) {
  const count = await db.businessPortfolioItem.count({ where: { profileId } });
  if (count > 0) return;

  const legacy = await db.portfolio.findMany({
    where: { userId, isPublished: true },
    orderBy: { order: 'asc' },
  });

  if (legacy.length === 0) return;

  await db.businessPortfolioItem.createMany({
    data: legacy.flatMap((p, i) => {
      const urls = parseJsonArray<string>(p.imageUrls);
      if (urls.length === 0) {
        return [
          {
            profileId,
            type: 'IMAGE' as const,
            title: p.title,
            description: p.description,
            mediaUrl: p.videoUrl ?? '/images/placeholders/portfolio.jpg',
            order: i,
            metadata: toJson({}),
          },
        ];
      }
      return urls.map((url, j) => ({
        profileId,
        type: 'IMAGE' as const,
        title: urls.length > 1 ? `${p.title} (${j + 1})` : p.title,
        description: p.description,
        mediaUrl: url,
        order: i * 10 + j,
        metadata: toJson({}),
      }));
    }),
  });
}

/** Map marketplace Review rows into profile reviews. */
export async function seedReviewsFromLegacy(profileId: string, userId: string) {
  const count = await db.businessProfileReview.count({ where: { profileId } });
  if (count > 0) return;

  const reviews = await db.review.findMany({
    where: { userId, isPublished: true },
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (reviews.length === 0) return;

  await db.businessProfileReview.createMany({
    data: reviews.map((r) => ({
      profileId,
      userName: `${r.author.firstName} ${r.author.lastName}`.trim() || 'کاربر',
      rating: r.rating,
      comment: r.comment ?? '',
      reply: r.response,
      authorId: r.authorId,
    })),
  });

  const avg =
    reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  await db.businessProfile.update({
    where: { id: profileId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length },
  });
}
