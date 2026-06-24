import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { parseCategoryStatus } from '@/lib/categories/category-status';
import type { CategoryStatus } from '@prisma/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'taxonomy:categories:write');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === 'string') : [];
    const status = parseCategoryStatus(body.status);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'شناسه دسته‌ها الزامی است' }, { status: 400 });
    }
    if (!status) {
      return NextResponse.json({ error: 'وضعیت نامعتبر است' }, { status: 400 });
    }

    const existing = await db.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, slug: true },
    });

    await db.category.updateMany({
      where: { id: { in: ids } },
      data: { status: status as CategoryStatus },
    });

    for (const row of existing) {
      if (row.status === status) continue;
      await logAdminAction(request, authz.user.id, 'taxonomy.category.status.update', 'Category', row.id, {
        oldStatus: row.status,
        newStatus: status,
        slug: row.slug,
        bulk: true,
      });
    }

    return NextResponse.json({ updated: existing.length, status });
  } catch (error) {
    console.error('Super admin categories bulk error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
