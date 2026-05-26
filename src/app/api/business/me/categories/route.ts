import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { canManageBusinessProfile } from '@/lib/business/can-manage-business-profile';
import { parseJsonArray, parseJsonObject, toJson } from '@/lib/business/json-fields';
import { getBlueprintForCategorySlug } from '@/config/business-profile-blueprints';
import { isCategorySlug } from '@/config/categories';
import type { ProfileLayoutConfig } from '@/contracts/business-profile';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await ensureBusinessProfile(user);
    const categorySlugs = parseJsonArray<string>(profile.categorySlugs);
    const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
    const layout = (extensions._layout as ProfileLayoutConfig | undefined) ?? {};
    const primary = categorySlugs[0] ?? null;
    const blueprint = primary ? getBlueprintForCategorySlug(primary) : null;

    return NextResponse.json({
      categorySlugs,
      primaryCategorySlug: primary,
      template: layout.template ?? blueprint?.id ?? 'company',
      blueprintTitle: blueprint?.titleFa ?? 'شرکت / سازمان',
    });
  } catch (error) {
    console.error('Business categories GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageBusinessProfile(user.role)) {
      return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const primaryCategorySlug = body.primaryCategorySlug as string | undefined;
    const extraSlugs = (body.categorySlugs as string[] | undefined) ?? [];

    if (!primaryCategorySlug || !isCategorySlug(primaryCategorySlug)) {
      return NextResponse.json({ error: 'دسته‌بندی نامعتبر است' }, { status: 400 });
    }

    const blueprint = getBlueprintForCategorySlug(primaryCategorySlug);
    const slugs = [primaryCategorySlug, ...extraSlugs.filter((s) => s !== primaryCategorySlug && isCategorySlug(s))];

    const profile = await ensureBusinessProfile(user);
    const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
    const layout = (extensions._layout as ProfileLayoutConfig | undefined) ?? {};

    const nextExtensions = {
      ...extensions,
      _layout: {
        ...layout,
        template: blueprint.id,
        defaultTab: layout.defaultTab ?? blueprint.defaultTab,
      },
    };

    await db.businessProfile.update({
      where: { id: profile.id },
      data: {
        categorySlugs: toJson(slugs),
        extensions: toJson(nextExtensions),
      },
    });

    return NextResponse.json({
      message: 'دسته‌بندی ذخیره شد',
      categorySlugs: slugs,
      template: blueprint.id,
      blueprintTitle: blueprint.titleFa,
    });
  } catch (error) {
    console.error('Business categories PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
