import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'growth:coupons:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active')?.trim() || '';

    const where: Prisma.CouponWhereInput = {};
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;
    if (q) where.OR = [{ code: { contains: q } }];

    const [total, coupons] = await Promise.all([
      db.coupon.count({ where }),
      db.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      coupons: coupons.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        expiresAt: c.expiresAt?.toISOString() ?? null,
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin coupons GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
