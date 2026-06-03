import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import { logAdminAction } from '@/lib/audit/admin-audit';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:alerts:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active')?.trim() || '';
    const userId = searchParams.get('userId')?.trim() || '';

    const where: Prisma.NeedBrowseAlertWhereInput = {};
    if (active === 'true') where.active = true;
    if (active === 'false') where.active = false;
    if (userId) where.userId = userId;
    if (q) {
      where.OR = [
        { label: { contains: q } },
        { browsePath: { contains: q } },
        { categorySlug: { contains: q } },
        { user: { phone: { contains: q } } },
      ];
    }

    const [total, alerts] = await Promise.all([
      db.needBrowseAlert.count({ where }),
      db.needBrowseAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          label: true,
          browsePath: true,
          categorySlug: true,
          citySlugs: true,
          searchQuery: true,
          fingerprint: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: { id: true, phone: true, displayName: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      alerts: alerts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin need-alerts GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:settings:write');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'شناسه alert الزامی است' }, { status: 400 });
    }

    const existing = await db.needBrowseAlert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'alert یافت نشد' }, { status: 404 });
    }

    const alert = await db.needBrowseAlert.update({
      where: { id },
      data: { active: false },
    });

    await logAdminAction(request, authz.user.id, 'market.alert.deactivate', 'NeedBrowseAlert', id, {});

    return NextResponse.json({
      alert: {
        ...alert,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Super admin need-alerts PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
