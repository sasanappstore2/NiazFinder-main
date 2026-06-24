import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { rollbackCategoryFieldOverrides } from '@/lib/need-intake/admin-field-specs/intake-field-spec-store';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authz = await requirePermission(request, 'ops:intake-field-specs:write');
    if (!authz.ok) return authz.response;

    const { slug } = await params;
    const entry = await rollbackCategoryFieldOverrides(slug);
    if (!entry) {
      return NextResponse.json({ error: 'نسخه قبلی برای rollback وجود ندارد' }, { status: 404 });
    }

    await logAdminAction(request, authz.user.id, 'intake.field-spec.rollback', 'Category', slug, {
      fieldCount: entry.fields.length,
    });

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    console.error('intake-field-specs rollback error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
