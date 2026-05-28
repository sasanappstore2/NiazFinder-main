import type {
  Business,
  BusinessOffer,
  BusinessPortfolioItem,
  BusinessReview,
  BusinessExtension,
  AiAssistantConfig,
  OfferCtaType,
  PortfolioMediaType,
  BusinessStatus,
  ProfileLayoutConfig,
} from '@/contracts/business-profile';
import type {
  BusinessProfile,
  BusinessOffer as DbOffer,
  BusinessPortfolioItem as DbPortfolio,
  BusinessProfileReview,
  User,
} from '@prisma/client';
import { parseJsonArray, parseJsonObject } from '@/lib/business/json-fields';
import { routeBuilder } from '@/config/routes';
import { CANONICAL_CITIES } from '@/config/locations';
import { slugifyBusinessName } from '@/lib/business/slug';
import { parseOfferStorefrontFromFeatures } from '@/lib/business/offer-storefront-meta';

type ProfileWithRelations = BusinessProfile & {
  offers: DbOffer[];
  portfolioItems: DbPortfolio[];
  profileReviews: BusinessProfileReview[];
  user: Pick<User, 'id' | 'avatar' | 'isVerified' | 'phone' | 'email' | 'online'>;
};

const CTA_MAP: Record<string, OfferCtaType> = {
  BOOK: 'book',
  QUOTE: 'quote',
  CALL: 'call',
  CHAT: 'chat',
};

const MEDIA_MAP: Record<string, PortfolioMediaType> = {
  IMAGE: 'image',
  VIDEO: 'video',
  BEFORE_AFTER: 'before_after',
};

function mapCta(v: string): OfferCtaType {
  return CTA_MAP[v] ?? 'chat';
}

function mapMedia(v: string): PortfolioMediaType {
  return MEDIA_MAP[v] ?? 'image';
}

function mapOffer(o: DbOffer): BusinessOffer {
  const rawFeatures = parseJsonArray<string>(o.features);
  const { meta, displayFeatures } = parseOfferStorefrontFromFeatures(rawFeatures);
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    priceRange: o.priceRange ?? undefined,
    duration: o.duration ?? undefined,
    images: parseJsonArray<string>(o.images),
    features: displayFeatures,
    faq: parseJsonArray<{ q: string; a: string }>(o.faq),
    ctaType: mapCta(o.ctaType),
    vitrineCategoryId: meta.primaryCategoryId ?? meta.categoryIds[0] ?? null,
    categoryIds: meta.categoryIds,
    primaryCategoryId: meta.primaryCategoryId,
    variants: meta.variants,
  };
}

function mapPortfolio(p: DbPortfolio): BusinessPortfolioItem {
  return {
    id: p.id,
    type: mapMedia(p.type),
    title: p.title,
    description: p.description ?? undefined,
    mediaUrl: p.mediaUrl,
    metadata: parseJsonObject(p.metadata, {}),
  };
}

function mapReview(r: BusinessProfileReview): BusinessReview {
  return {
    id: r.id,
    userName: r.userName,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    reply: r.reply ?? undefined,
  };
}

export function mapProfileToBusiness(
  profile: ProfileWithRelations,
  citySlug?: string,
  primaryCategory?: string
): Business {
  const categories = parseJsonArray<string>(profile.categorySlugs);
  const tags = parseJsonArray<string>(profile.tags);
  const badges = parseJsonArray<string>(profile.badges);
  const extensionsRaw = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
  const layoutConfig = (extensionsRaw._layout as ProfileLayoutConfig | undefined) ?? undefined;
  const { _layout: _omit, ...extRest } = extensionsRaw;
  const extensions =
    Object.keys(extRest).length > 0 ? (extRest as BusinessExtension) : undefined;
  const aiRaw = parseJsonObject<Partial<AiAssistantConfig>>(profile.aiAssistantConfig, {
    systemPrompt: '',
    dynamicQuestions: [],
  });

  const city = profile.city ?? '';
  const cat = primaryCategory ?? categories[0] ?? 'services';
  const seoPath = profile.slug
    ? routeBuilder.businessProfile(profile.slug)
    : routeBuilder.pro(profile.userId);

  const business: Business = {
    id: profile.userId,
    userId: profile.userId,
    name: profile.name,
    slug: profile.slug,
    identity: {
      logo: profile.logo ?? profile.user.avatar ?? undefined,
      coverImage: profile.coverImage ?? undefined,
      description: profile.description ?? '',
      category: categories,
      tags,
      location: {
        city,
        province: profile.province ?? undefined,
        address: profile.address ?? undefined,
        geo:
          profile.lat != null && profile.lng != null
            ? { lat: profile.lat, lng: profile.lng }
            : undefined,
      },
      status: profile.status === 'ACTIVE' ? 'active' : 'inactive',
    },
    trust: {
      rating: profile.rating,
      reviewCount: profile.reviewCount,
      verified: profile.verified || profile.user.isVerified,
      badges,
      responseRate: profile.responseRate,
      responseTime: profile.responseTime ?? undefined,
      yearsActive: profile.yearsActive,
    },
    offers: profile.offers.filter((o) => o.isPublished).map(mapOffer),
    portfolio: profile.portfolioItems.filter((p) => p.isPublished).map(mapPortfolio),
    reviews: profile.profileReviews.filter((r) => r.isPublished).map(mapReview),
    aiAssistantConfig: {
      systemPrompt: aiRaw.systemPrompt ?? '',
      dynamicQuestions: aiRaw.dynamicQuestions ?? [],
      categoryHint: aiRaw.categoryHint,
    },
    contact: {
      phone: profile.phone ?? profile.user.phone ?? undefined,
      whatsapp: profile.whatsapp ?? undefined,
      email: profile.email ?? profile.user.email ?? undefined,
      chatEnabled: profile.chatEnabled,
    },
    seo: {
      title: profile.seoTitle ?? `${profile.name} | ${city}`,
      description: profile.seoDescription ?? profile.description?.slice(0, 160) ?? '',
      keywords: parseJsonArray<string>(profile.seoKeywords),
      canonicalUrl: seoPath,
    },
    analytics: {
      views: profile.viewCount,
      clicks: profile.clickCount,
      conversions: profile.conversionCount,
      saves: profile.saveCount,
    },
    extensions: extensions ? { ...extensions, ...(layoutConfig ? { _layout: layoutConfig } : {}) } : layoutConfig ? { _layout: layoutConfig } : undefined,
    layoutConfig,
  };

  return business;
}

function cityToSlug(city: string): string {
  const normalized = city.trim();
  const found = CANONICAL_CITIES.find(
    (c) => c.title === normalized || c.englishTitle.toLowerCase() === normalized.toLowerCase()
  );
  return found?.slug ?? slugifyBusinessName(normalized);
}
