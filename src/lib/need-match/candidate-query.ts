import { db } from '@/lib/db';
import type { MatchedBusinessItem, NeedMatchContext } from '@/contracts/need-match';
import { expandCategorySlugsForMatch, normalizeProfileSlugsForMatch } from './category-slugs';

interface RawCandidate {
  id: string;
  userId: string;
  name: string;
  slug: string;
  logo: string | null;
  city: string | null;
  province: string | null;
  address: string | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  description: string | null;
  categorySlugs: string[];
  topOfferTitle?: string;
  ruleScore: number;
  matchReasonFa: string;
  chatEnabled: boolean;
  hasPhone: boolean;
}

function parseCategorySlugs(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function scoreCandidate(
  need: NeedMatchContext,
  relevantSlugs: string[],
  businessSlugs: string[],
  city?: string | null,
  province?: string | null,
  name?: string,
  description?: string | null,
  offerTitle?: string,
  businessAddress?: string | null
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  const slugOverlap = businessSlugs.filter((s) => relevantSlugs.includes(s));
  if (slugOverlap.length > 0) {
    score += 0.45;
    reasons.push('هم‌خوانی دسته‌بندی');
  }

  if (need.city && city && need.city === city) {
    score += 0.25;
    reasons.push('همان شهر');
  } else if (need.province && province && need.province === province) {
    score += 0.12;
    reasons.push('همان استان');
  }

  if (need.address && businessAddress) {
    const na = need.address.toLowerCase();
    const ba = businessAddress.toLowerCase();
    if (na.length > 3 && (ba.includes(na) || na.includes(ba))) {
      score += 0.2;
      reasons.push('هم‌محله/محدوده');
    } else {
      const needTokens = na.split(/[\s،,]+/).filter((t) => t.length > 2);
      const matched = needTokens.filter((t) => ba.includes(t));
      if (matched.length >= 1) {
        score += 0.12;
        reasons.push('نزدیکی محدوده');
      }
    }
  }

  const haystack = `${name ?? ''} ${description ?? ''} ${offerTitle ?? ''} ${businessAddress ?? ''}`.toLowerCase();
  const needles = `${need.title} ${need.description}`.toLowerCase();
  const keywords = ['ps5', 'ps4', 'playstation', 'گوشی', 'iphone', 'لپ‌تاپ', 'خودرو', 'ملک', 'آپارتمان'];
  for (const kw of keywords) {
    if (needles.includes(kw) && haystack.includes(kw)) {
      score += 0.15;
      reasons.push('تطابق کلمات کلیدی');
      break;
    }
  }

  if (reasons.length === 0) reasons.push('نزدیک به نیاز شما');
  return { score: Math.min(score, 0.95), reason: reasons.join(' · ') };
}

const candidateCache = new Map<string, { at: number; data: RawCandidate[] }>();
const CANDIDATE_CACHE_TTL_MS = 60_000;

export async function findCandidateBusinesses(
  need: NeedMatchContext,
  limit = 30
): Promise<RawCandidate[]> {
  const cacheKey = `${need.categorySlug}|${need.city ?? ''}|${need.province ?? ''}|${limit}`;
  const cached = candidateCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CANDIDATE_CACHE_TTL_MS) {
    return cached.data;
  }

  const relevantSlugs = expandCategorySlugsForMatch(need.categorySlug);
  const needText = `${need.title} ${need.description}`.toLowerCase();

  const profiles = await db.businessProfile.findMany({
    where: { status: 'ACTIVE' },
    include: {
      offers: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        take: 1,
      },
    },
    take: 120,
    orderBy: [{ verified: 'desc' }, { rating: 'desc' }, { reviewCount: 'desc' }],
  });

  const scored: RawCandidate[] = [];

  for (const p of profiles) {
    const businessSlugs = normalizeProfileSlugsForMatch(parseCategorySlugs(p.categorySlugs));
    const offerTitle = p.offers[0]?.title;
    const { score, reason } = scoreCandidate(
      need,
      relevantSlugs,
      businessSlugs,
      p.city,
      p.province,
      p.name,
      p.description,
      offerTitle,
      p.address
    );

    const categoryMatch = businessSlugs.some((s) => relevantSlugs.includes(s));
    const textMatch =
      needText.length > 4 &&
      `${p.name} ${p.description ?? ''} ${offerTitle ?? ''}`.toLowerCase().split(/\s+/).some((w) => w.length > 3 && needText.includes(w));

    if (!categoryMatch && score < 0.2 && !textMatch) continue;

    scored.push({
      id: p.id,
      userId: p.userId,
      name: p.name,
      slug: p.slug,
      logo: p.logo,
      city: p.city,
      province: p.province,
      address: p.address,
      rating: p.rating,
      reviewCount: p.reviewCount,
      verified: p.verified,
      description: p.description,
      categorySlugs: businessSlugs,
      topOfferTitle: offerTitle,
      ruleScore: score + (p.verified ? 0.05 : 0) + p.rating * 0.02,
      matchReasonFa: reason,
      chatEnabled: p.chatEnabled ?? true,
      hasPhone: Boolean(p.phone?.trim()),
    });
  }

  scored.sort((a, b) => b.ruleScore - a.ruleScore);

  if (scored.length >= 3) {
    const result = scored.slice(0, limit);
    candidateCache.set(cacheKey, { at: Date.now(), data: result });
    return result;
  }

  const specialists = await db.user.findMany({
    where: { role: 'SPECIALIST', isActive: true, isBanned: false },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      avatar: true,
      city: true,
      province: true,
      bio: true,
      isVerified: true,
    },
    take: 80,
  });

  for (const u of specialists) {
    if (scored.some((s) => s.userId === u.id)) continue;
    const name = u.displayName ?? `${u.firstName} ${u.lastName}`;
    const { score, reason } = scoreCandidate(
      need,
      relevantSlugs,
      [],
      u.city,
      u.province,
      name,
      u.bio
    );
    if (score < 0.15 && !needText.includes('خدمات')) continue;

    scored.push({
      id: u.id,
      userId: u.id,
      name,
      slug: u.id,
      logo: u.avatar,
      city: u.city,
      province: u.province,
      address: null,
      rating: 0,
      reviewCount: 0,
      verified: u.isVerified,
      description: u.bio,
      categorySlugs: [],
      ruleScore: score,
      matchReasonFa: reason,
      chatEnabled: true,
      hasPhone: false,
    });
  }

  scored.sort((a, b) => b.ruleScore - a.ruleScore);
  const result = scored.slice(0, limit);
  candidateCache.set(cacheKey, { at: Date.now(), data: result });
  return result;
}

export function toMatchedBusinessItems(candidates: RawCandidate[]): MatchedBusinessItem[] {
  return candidates.map((c) => ({
    id: c.id,
    userId: c.userId,
    name: c.name,
    slug: c.slug,
    logo: c.logo,
    city: c.city,
    province: c.province,
    rating: c.rating,
    reviewCount: c.reviewCount,
    verified: c.verified,
    matchScore: Math.round(c.ruleScore * 100) / 100,
    matchReasonFa: c.matchReasonFa,
    topOfferTitle: c.topOfferTitle,
    chatEnabled: c.chatEnabled,
    hasPhone: c.hasPhone,
  }));
}
