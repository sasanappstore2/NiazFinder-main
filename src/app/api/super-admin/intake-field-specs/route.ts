import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import {
  listIntakeFieldSpecCategories,
  loadIntakeFieldSpecStore,
  saveCategoryFieldOverrides,
} from '@/lib/need-intake/admin-field-specs/intake-field-spec-store';
import type { CategoryFilterField } from '@/config/category-filters/types';

export const runtime = 'nodejs';

function isValidField(raw: unknown): raw is CategoryFilterField {
  if (!raw || typeof raw !== 'object') return false;
  const f = raw as Record<string, unknown>;
  return typeof f.key === 'string' && typeof f.label === 'string' && typeof f.kind === 'string';
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:intake-field-specs:read');
    if (!authz.ok) return authz.response;

    const store = await loadIntakeFieldSpecStore();
    const categories = await listIntakeFieldSpecCategories();

    return NextResponse.json({
      version: store.version,
      categories,
      totalCategories: categories.length,
    });
  } catch (error) {
    console.error('intake-field-specs GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:intake-field-specs:write');
    if (!authz.ok) return authz.response;

    const body = (await request.json()) as {
      categorySlug?: string;
      fields?: unknown[];
    };

    const categorySlug = body.categorySlug?.trim();
    if (!categorySlug) {
      return NextResponse.json({ error: 'categorySlug الزامی است' }, { status: 400 });
    }

    const fields = Array.isArray(body.fields) ? body.fields.filter(isValidField) : null;
    if (!fields) {
      return NextResponse.json({ error: 'fields نامعتبر است' }, { status: 400 });
    }

    const entry = await saveCategoryFieldOverrides(categorySlug, fields);

    await logAdminAction(request, authz.user.id, 'intake.field-spec.save', 'Category', categorySlug, {
      fieldCount: fields.length,
    });

    return NextResponse.json({ ok: true, categorySlug, entry });
  } catch (error) {
    console.error('intake-field-specs POST error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
