import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireBusinessManager } from '@/lib/business/require-business-manager';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { mapProfileToBusiness } from '@/lib/business/map-profile';
import { parseJsonObject, toJson } from '@/lib/business/json-fields';
import type { ProfileLayoutConfig, ProfileTabId } from '@/contracts/business-profile';
import { getTabSpecsForBusiness, getValidTabIds, resolveDefaultProfileTab } from '@/lib/business/profile-tabs';
import { getBlueprintForBusiness } from '@/config/business-profile-blueprints';

export const runtime = 'nodejs';

async function loadOwnerBusiness(userId: string) {
  const profile = await db.businessProfile.findUnique({
    where: { userId },
    include: {
      offers: { where: { isPublished: true }, orderBy: { order: 'asc' } },
      portfolioItems: { where: { isPublished: true }, orderBy: { order: 'asc' } },
      profileReviews: { where: { isPublished: true }, orderBy: { createdAt: 'desc' }, take: 50 },
      user: { select: { id: true, avatar: true, isVerified: true, phone: true, email: true, online: true } },
    },
  });
  if (!profile) return null;
  return mapProfileToBusiness(profile);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const business = await loadOwnerBusiness(user.id);
    if (!business) {
      return NextResponse.json({
        defaultTab: 'intro' as ProfileTabId,
        tabs: [{ id: 'intro', labelFa: 'معرفی' }],
        template: 'company',
      });
    }

    const blueprint = getBlueprintForBusiness(business);
    return NextResponse.json({
      defaultTab: resolveDefaultProfileTab(business),
      tabs: getTabSpecsForBusiness(business).map((t) => ({ id: t.id, labelFa: t.labelFa })),
      template: blueprint.id,
      blueprintTitle: blueprint.titleFa,
    });
  } catch (error) {
    console.error('Business layout GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireBusinessManager(request);
    if ('error' in auth) return auth.error;
    const user = auth.user;

    const profile = await ensureBusinessProfile(user);
    const business = await loadOwnerBusiness(user.id);

    const body = await request.json().catch(() => ({}));
    const defaultTab = body.defaultTab as ProfileTabId | undefined;

    if (!defaultTab || !business || !getValidTabIds(business).includes(defaultTab)) {
      return NextResponse.json({ error: 'تب پیش‌فرض نامعتبر است' }, { status: 400 });
    }

    const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
    const layout = (extensions._layout as ProfileLayoutConfig | undefined) ?? {};

    const nextExtensions = {
      ...extensions,
      _layout: { ...layout, defaultTab },
    };

    await db.businessProfile.update({
      where: { id: profile.id },
      data: { extensions: toJson(nextExtensions) },
    });

    return NextResponse.json({
      message: 'ذخیره شد',
      defaultTab,
    });
  } catch (error) {
    console.error('Business layout PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
