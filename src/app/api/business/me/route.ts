import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessManager } from '@/lib/business/require-business-manager';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { slugifyBusinessName } from '@/lib/business/slug';
import { parseJsonArray } from '@/lib/business/json-fields';
import { routeBuilder } from '@/config/routes';

export const runtime = 'nodejs';

const EDIT_SELECT = {
  slug: true,
  name: true,
  logo: true,
  coverImage: true,
  description: true,
  categorySlugs: true,
  city: true,
  province: true,
  address: true,
  phone: true,
  whatsapp: true,
  email: true,
  chatEnabled: true,
  seoTitle: true,
  seoDescription: true,
  verified: true,
  viewCount: true,
} as const;

function mapProfileResponse(
  profile: Awaited<ReturnType<typeof ensureBusinessProfile>>
) {
  const categorySlugs = parseJsonArray<string>(profile.categorySlugs);
  return {
    slug: profile.slug,
    name: profile.name,
    logo: profile.logo,
    coverImage: profile.coverImage,
    description: profile.description ?? '',
    categorySlugs,
    primaryCategorySlug: categorySlugs[0] ?? null,
    city: profile.city ?? '',
    province: profile.province ?? '',
    address: profile.address ?? '',
    phone: profile.phone ?? '',
    whatsapp: profile.whatsapp ?? '',
    email: profile.email ?? '',
    chatEnabled: profile.chatEnabled,
    seoTitle: profile.seoTitle ?? '',
    seoDescription: profile.seoDescription ?? '',
    verified: profile.verified,
    viewCount: profile.viewCount,
    publicUrl: routeBuilder.businessProfile(profile.slug),
    editUrl: routeBuilder.businessEdit(profile.slug),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireBusinessManager(request);
    if ('error' in auth) return auth.error;

    const profile = await ensureBusinessProfile(auth.user);
    const full = await db.businessProfile.findUnique({
      where: { id: profile.id },
      select: EDIT_SELECT,
    });

    if (!full) {
      return NextResponse.json({ error: 'پروفایل یافت نشد' }, { status: 404 });
    }

    return NextResponse.json(mapProfileResponse({ ...profile, ...full }));
  } catch (error) {
    console.error('Business me GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireBusinessManager(request);
    if ('error' in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const profile = await ensureBusinessProfile(auth.user);

    const data: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (name.length < 2) {
        return NextResponse.json({ error: 'نام کسب‌وکار باید حداقل ۲ کاراکتر باشد' }, { status: 400 });
      }
      data.name = name.slice(0, 120);
    }

    if (typeof body.slug === 'string') {
      const slug = slugifyBusinessName(body.slug);
      if (slug.length < 2) {
        return NextResponse.json({ error: 'آدرس پروفایل نامعتبر است' }, { status: 400 });
      }
      if (slug !== profile.slug) {
        const taken = await db.businessProfile.findUnique({ where: { slug } });
        if (taken) {
          return NextResponse.json({ error: 'این آدرس قبلاً استفاده شده است' }, { status: 409 });
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

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'فیلدی برای بروزرسانی ارسال نشده' }, { status: 400 });
    }

    const updated = await db.businessProfile.update({
      where: { id: profile.id },
      data,
      select: EDIT_SELECT,
    });

    return NextResponse.json({
      message: 'ذخیره شد',
      ...mapProfileResponse({ ...profile, ...updated }),
    });
  } catch (error) {
    console.error('Business me PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
