import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { canManageBusinessProfile } from '@/lib/business/can-manage-business-profile';
import { parseJsonArray, parseJsonObject, toJson } from '@/lib/business/json-fields';
import { getBlueprintForOccupationSlug } from '@/config/business-profile-blueprints';
import { isPickableProfileCategorySlug } from '@/lib/business/business-category';
import type { ProfileLayoutConfig } from '@/contracts/business-profile';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await ensureBusinessProfile(user);
    const occupationSlugs = parseJsonArray<string>(profile.categorySlugs);
    const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
    const layout = (extensions._layout as ProfileLayoutConfig | undefined) ?? {};
    const primary =
      occupationSlugs.find((s) => isPickableProfileCategorySlug(s)) ?? occupationSlugs[0] ?? null;
    const blueprint = primary ? getBlueprintForOccupationSlug(primary) : null;

    return NextResponse.json({
      categorySlugs: occupationSlugs,
      occupationSlugs,
      primaryCategorySlug: primary,
      primaryOccupationSlug: primary,
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
    const rawList = (body.occupationSlugs ?? body.categorySlugs) as string[] | undefined;
    const primaryOccupationSlug = (body.primaryOccupationSlug ?? body.primaryCategorySlug) as
      | string
      | undefined;

    let slugs: string[] = [];
    if (Array.isArray(rawList) && rawList.length > 0) {
      slugs = [
        ...new Set(
          rawList.filter((s) => typeof s === 'string' && isPickableProfileCategorySlug(s))
        ),
      ].slice(0, 3);
    } else if (primaryOccupationSlug && isPickableProfileCategorySlug(primaryOccupationSlug)) {
      slugs = [primaryOccupationSlug];
    }

    if (slugs.length === 0) {
      return NextResponse.json(
        { error: 'حداقل یک شغل یا حوزه فروشگاه اینترنتی معتبر انتخاب کنید' },
        { status: 400 }
      );
    }

    const blueprint = getBlueprintForOccupationSlug(slugs[0]);

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
      message: 'حوزهٔ کاری ذخیره شد',
      categorySlugs: slugs,
      occupationSlugs: slugs,
      primaryOccupationSlug: slugs[0],
      primaryCategorySlug: slugs[0],
      template: blueprint.id,
      blueprintTitle: blueprint.titleFa,
    });
  } catch (error) {
    console.error('Business categories PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
