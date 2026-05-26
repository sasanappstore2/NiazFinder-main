import { db } from '@/lib/db';
import { slugifyBusinessName, uniqueBusinessSlug } from '@/lib/business/slug';
import { parseJsonArray, toJson } from '@/lib/business/json-fields';
import type { BusinessProfile, User } from '@prisma/client';

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
  | 'address'
  | 'phone'
  | 'email'
  | 'isVerified'
  | 'createdAt'
  | 'role'
>;

/** Load or create BusinessProfile from a specialist User. */
export async function ensureBusinessProfile(user: UserForProfile): Promise<BusinessProfile> {
  const existing = await db.businessProfile.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  const name =
    user.displayName?.trim() ||
    `${user.firstName} ${user.lastName}`.trim() ||
    'کسب‌وکار';

  const slug = await uniqueBusinessSlug(name, async (s) => {
    const row = await db.businessProfile.findUnique({ where: { slug: s } });
    return Boolean(row);
  });

  const yearsActive = Math.max(
    0,
    Math.floor((Date.now() - user.createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  );

  const profile = await db.businessProfile.create({
    data: {
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
    },
  });

  await syncCategorySlugsFromSkills(profile.id, user.id);
  return profile;
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
    const slug = us.skill.category?.slug;
    if (slug) slugs.add(slug);
  }

  if (slugs.size === 0) return;

  await db.businessProfile.update({
    where: { id: profileId },
    data: { categorySlugs: toJson([...slugs]) },
  });
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
            mediaUrl: p.videoUrl ?? '/placeholder-portfolio.jpg',
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
