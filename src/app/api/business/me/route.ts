import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import {
  suggestProfileSlugFromWebPresence,
  validateBusinessProfileSlug,
} from '@/lib/business/profile-slug';
import { parseJsonArray, parseJsonObject } from '@/lib/business/json-fields';
import type { WebPresenceExtension } from '@/contracts/business-profile';
import { routeBuilder } from '@/config/routes';
import { hasCompletedOnboarding, needsOnboarding } from '@/lib/business/onboarding';
import { isPickableProfileCategorySlug } from '@/lib/business/business-category';
import { parseStorefrontExtension } from '@/lib/business/storefront';
import type { BusinessProfile } from '@prisma/client';

export const runtime = 'nodejs';

const PATCH_SELECT = {
  slug: true,
  name: true,
  logo: true,
  coverImage: true,
  description: true,
  categorySlugs: true,
  city: true,
  province: true,
  address: true,
  lat: true,
  lng: true,
  phone: true,
  whatsapp: true,
  email: true,
  chatEnabled: true,
  seoTitle: true,
  seoDescription: true,
  verified: true,
  viewCount: true,
  status: true,
} as const;

function readWebPresence(profile: BusinessProfile): WebPresenceExtension {
  const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
  const wp = extensions.webPresence;
  if (!wp || typeof wp !== 'object') return {};
  const o = wp as Record<string, unknown>;
  return {
    website: typeof o.website === 'string' ? o.website : '',
    instagram: typeof o.instagram === 'string' ? o.instagram : '',
    telegram: typeof o.telegram === 'string' ? o.telegram : '',
    bale: typeof o.bale === 'string' ? o.bale : '',
    rubika: typeof o.rubika === 'string' ? o.rubika : '',
    eitaa: typeof o.eitaa === 'string' ? o.eitaa : '',
  };
}

function mapProfileResponse(profile: BusinessProfile) {
  const occupationSlugs = parseJsonArray<string>(profile.categorySlugs);
  const primaryOccupationSlug =
    occupationSlugs.find((s) => isPickableProfileCategorySlug(s)) ?? occupationSlugs[0] ?? null;
  const web = readWebPresence(profile);
  return {
    slug: profile.slug,
    name: profile.name,
    logo: profile.logo ?? '',
    coverImage: profile.coverImage ?? '',
    website: web.website ?? '',
    instagram: web.instagram ?? '',
    telegram: web.telegram ?? '',
    bale: web.bale ?? '',
    rubika: web.rubika ?? '',
    eitaa: web.eitaa ?? '',
    description: profile.description ?? '',
    categorySlugs: occupationSlugs,
    occupationSlugs,
    primaryCategorySlug: primaryOccupationSlug,
    primaryOccupationSlug,
    city: profile.city ?? '',
    province: profile.province ?? '',
    address: profile.address ?? '',
    lat: profile.lat,
    lng: profile.lng,
    phone: profile.phone ?? '',
    whatsapp: profile.whatsapp ?? '',
    email: profile.email ?? '',
    chatEnabled: profile.chatEnabled,
    seoTitle: profile.seoTitle ?? '',
    seoDescription: profile.seoDescription ?? '',
    verified: profile.verified,
    viewCount: profile.viewCount,
    status: profile.status,
    onboardingCompleted: hasCompletedOnboarding(profile),
    needsOnboarding: needsOnboarding(profile),
    publicUrl: routeBuilder.businessProfile(profile.slug),
    editUrl: routeBuilder.myBusiness(),
    suggestedProfileSlug: suggestProfileSlugFromWebPresence(web) ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireBusinessAccess(request);
    if ('error' in auth) return auth.error;

    const profile = await loadMyBusinessProfile(auth.user);

    const [offerCount, portfolioCount] = await Promise.all([
      db.businessOffer.count({ where: { profileId: profile.id } }),
      db.businessPortfolioItem.count({ where: { profileId: profile.id } }),
    ]);

    const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
    const storefront = parseStorefrontExtension(extensions.storefront);

    return NextResponse.json({
      ...mapProfileResponse(profile),
      offerCount,
      portfolioCount,
      storefrontCategoryCount: storefront.categories.length,
      roleUpgraded: auth.roleUpgraded,
    });
  } catch (error) {
    console.error('Business me GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireBusinessAccess(request);
    if ('error' in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const profile = await loadMyBusinessProfile(auth.user);

    const data: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (name.length < 2) {
        return NextResponse.json({ error: 'نام کسب‌وکار باید حداقل ۲ کاراکتر باشد' }, { status: 400 });
      }
      data.name = name.slice(0, 120);
    }

    if (typeof body.slug === 'string') {
      const validated = validateBusinessProfileSlug(body.slug);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.message }, { status: 400 });
      }
      const slug = validated.slug;
      if (slug !== profile.slug) {
        const taken = await db.businessProfile.findUnique({ where: { slug } });
        if (taken) {
          return NextResponse.json({ error: 'این نام کاربری قبلاً گرفته شده است' }, { status: 409 });
        }
        data.slug = slug;
      }
    }

    const stringFields = [
      'description',
      'logo',
      'coverImage',
      'city',
      'province',
      'address',
      'phone',
      'whatsapp',
      'email',
      'seoTitle',
      'seoDescription',
    ] as const;

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        data[field] = typeof body[field] === 'string' ? body[field].trim() : null;
      }
    }

    if (typeof body.chatEnabled === 'boolean') {
      data.chatEnabled = body.chatEnabled;
    }

    if (body.lat === null || body.lat === '') {
      data.lat = null;
    } else if (body.lat !== undefined) {
      const lat = Number(body.lat);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return NextResponse.json({ error: 'عرض جغرافیایی نامعتبر است' }, { status: 400 });
      }
      data.lat = lat;
    }

    if (body.lng === null || body.lng === '') {
      data.lng = null;
    } else if (body.lng !== undefined) {
      const lng = Number(body.lng);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return NextResponse.json({ error: 'طول جغرافیایی نامعتبر است' }, { status: 400 });
      }
      data.lng = lng;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'فیلدی برای بروزرسانی ارسال نشده' }, { status: 400 });
    }

    const updated = await db.businessProfile.update({
      where: { id: profile.id },
      data,
      select: PATCH_SELECT,
    });

    const onboardingCompletedAt = profile.onboardingCompletedAt;
    const merged = { ...profile, ...updated, onboardingCompletedAt } as BusinessProfile;

    return NextResponse.json({
      message: 'ذخیره شد',
      ...mapProfileResponse(merged),
    });
  } catch (error) {
    console.error('Business me PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
