import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import {
  exportCategoryFieldsAsTs,
  getCategoryFieldSpecEntry,
} from '@/lib/need-intake/admin-field-specs/intake-field-spec-store';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authz = await requirePermission(request, 'ops:intake-field-specs:read');
    if (!authz.ok) return authz.response;

    const { slug } = await params;
    const entry = await getCategoryFieldSpecEntry(slug);
    if (!entry?.fields.length) {
      return NextResponse.json({ error: 'override یافت نشد' }, { status: 404 });
    }

    const format = request.nextUrl.searchParams.get('format') ?? 'ts';
    if (format === 'json') {
      return NextResponse.json({ categorySlug: slug, fields: entry.fields });
    }

    const body = exportCategoryFieldsAsTs(slug, entry.fields);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}-intake-fields.ts"`,
      },
    });
  } catch (error) {
    console.error('intake-field-specs export error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
