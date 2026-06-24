import { NextRequest, NextResponse } from 'next/server';
import { getIntakeFieldsForCategoryBase } from '@/config/category-filters/registry';
import { mergeIntakeFieldSpecOverrides } from '@/config/category-filters/registry';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import {
  deleteCategoryFieldOverrides,
  getCategoryFieldSpecEntry,
  rollbackCategoryFieldOverrides,
} from '@/lib/need-intake/admin-field-specs/intake-field-spec-store';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const authz = await requirePermission(_request, 'ops:intake-field-specs:read');
    if (!authz.ok) return authz.response;

    const { slug } = await params;
    const entry = await getCategoryFieldSpecEntry(slug);
    const baseFields = getIntakeFieldsForCategoryBase(slug);
    const merged = mergeIntakeFieldSpecOverrides(
      baseFields,
      entry?.fields ?? []
    );

    return NextResponse.json({
      categorySlug: slug,
      overrides: entry?.fields ?? [],
      merged,
      historyCount: entry?.history.length ?? 0,
      updatedAt: entry?.updatedAt ?? null,
    });
  } catch (error) {
    console.error('intake-field-specs slug GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authz = await requirePermission(request, 'ops:intake-field-specs:write');
    if (!authz.ok) return authz.response;

    const { slug } = await params;
    const removed = await deleteCategoryFieldOverrides(slug);
    if (!removed) {
      return NextResponse.json({ error: 'override یافت نشد' }, { status: 404 });
    }

    await logAdminAction(request, authz.user.id, 'intake.field-spec.delete', 'Category', slug, {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('intake-field-specs slug DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
