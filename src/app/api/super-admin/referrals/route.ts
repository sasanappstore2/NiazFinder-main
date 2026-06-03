import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'growth:referrals:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim() || '';

    const where: Prisma.ReferralWhereInput = {};
    if (code) where.code = code;
    if (q) {
      where.OR = [{ code: { contains: q } }, { referrerId: { contains: q } }, { referredId: { contains: q } }];
    }

    const [total, referrals] = await Promise.all([
      db.referral.count({ where }),
      db.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      referrals: referrals.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin referrals GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
