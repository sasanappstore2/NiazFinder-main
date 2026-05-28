import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { parseJsonObject, toJson } from '@/lib/business/json-fields';
import { businessOnboardingPayloadSchema } from '@/lib/business/onboarding-schema';
import { getBlueprintForCategorySlug } from '@/config/business-profile-blueprints';
import type { ProfileLayoutConfig } from '@/contracts/business-profile';
import {
  buildBusinessSeoDescription,
  buildBusinessSeoTitle,
  resolveBusinessDisplayName,
} from '@/lib/business/suggest-display-name';

export const runtime = 'nodejs';

function emptyToNull(v: string | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBusinessAccess(request);
    if ('error' in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const parsed = businessOnboardingPayloadSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.message ?? 'داده‌های ارسالی نامعتبر است' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const profile = await loadMyBusinessProfile(auth.user);
    const blueprint = getBlueprintForCategorySlug(data.primaryCategorySlug);
    const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
    const layout = (extensions._layout as ProfileLayoutConfig | undefined) ?? {};

    const cleanedWebPresence: Record<string, string> = {};
    if (data.website) cleanedWebPresence.website = data.website;
    if (data.instagram) cleanedWebPresence.instagram = data.instagram;
    if (data.telegram) cleanedWebPresence.telegram = data.telegram;
    if (data.bale) cleanedWebPresence.bale = data.bale;
    if (data.rubika) cleanedWebPresence.rubika = data.rubika;
    if (data.eitaa) cleanedWebPresence.eitaa = data.eitaa;

    const now = new Date();
    const categorySlugs = data.occupationSlugs?.length
      ? data.occupationSlugs
      : [data.primaryCategorySlug];

    const displayName = resolveBusinessDisplayName(data.name, {
      primaryOccupationSlug: data.primaryCategorySlug,
      personName:
        auth.user.displayName?.trim() ||
        `${auth.user.firstName ?? ''} ${auth.user.lastName ?? ''}`.trim() ||
        null,
      city: data.city,
    });

    const seoMeta = {
      name: displayName,
      primaryOccupationSlug: data.primaryCategorySlug,
      description: data.description,
      city: data.city,
    };

    await db.businessProfile.update({
      where: { id: profile.id },
      data: {
        name: displayName,
        description: data.description || null,
        categorySlugs: toJson(categorySlugs),
        phone: data.phone,
        whatsapp: emptyToNull(data.whatsapp),
        email: emptyToNull(data.email),
        city: emptyToNull(data.city),
        province: emptyToNull(data.province),
        address: emptyToNull(data.address),
        logo: emptyToNull(data.logo),
        coverImage: emptyToNull(data.coverImage),
        status: 'ACTIVE',
        seoTitle: buildBusinessSeoTitle(seoMeta),
        seoDescription: buildBusinessSeoDescription(seoMeta),
        extensions: toJson({
          ...extensions,
          webPresence: cleanedWebPresence,
          _layout: {
            ...layout,
            template: blueprint.id,
            defaultTab: layout.defaultTab ?? blueprint.defaultTab,
          },
        }),
      },
    });

    await db.$executeRaw`
      UPDATE "BusinessProfile"
      SET "onboardingCompletedAt" = ${now}
      WHERE "id" = ${profile.id}
    `;

    const updated = await db.businessProfile.findUnique({
      where: { id: profile.id },
      select: { slug: true, name: true, status: true },
    });

    return NextResponse.json({
      message: 'پروفایل کسب‌وکار منتشر شد',
      slug: updated?.slug,
      name: updated?.name,
      onboardingCompleted: true,
      status: updated?.status,
    });
  } catch (error) {
    console.error('Business onboarding POST error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
