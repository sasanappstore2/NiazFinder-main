import { NextRequest, NextResponse } from 'next/server';
import { getActiveIntakeFieldOverrides, loadIntakeFieldSpecStore } from '@/lib/need-intake/admin-field-specs/intake-field-spec-store';

export const runtime = 'nodejs';

/** Public read — runtime overlay for intake forms (no auth). */
export async function GET(request: NextRequest) {
  try {
    await loadIntakeFieldSpecStore();
    const categorySlug = request.nextUrl.searchParams.get('categorySlug')?.trim();
    if (!categorySlug) {
      return NextResponse.json({ error: 'categorySlug الزامی است' }, { status: 400 });
    }

    const overrides = getActiveIntakeFieldOverrides(categorySlug);
    return NextResponse.json({
      categorySlug,
      fields: overrides,
      count: overrides.length,
    });
  } catch (error) {
    console.error('field-spec-overrides GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
