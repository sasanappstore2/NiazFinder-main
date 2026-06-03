import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import type { BusinessStatus, Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:businesses:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q, status } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const verified = searchParams.get('verified')?.trim() || '';

    const where: Prisma.BusinessProfileWhereInput = {};
    if (status) where.status = status as BusinessStatus;
    if (verified === 'true') where.verified = true;
    if (verified === 'false') where.verified = false;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
        { city: { contains: q } },
        { user: { phone: { contains: q } } },
        { user: { displayName: { contains: q } } },
      ];
    }

    const [total, businesses, active, inactive, pendingOnboarding] = await Promise.all([
      db.businessProfile.count({ where }),
      db.businessProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          status: true,
          verified: true,
          onboardingCompletedAt: true,
          rating: true,
          reviewCount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              phone: true,
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      db.businessProfile.count({ where: { ...where, status: 'ACTIVE' } }),
      db.businessProfile.count({ where: { ...where, status: 'INACTIVE' } }),
      db.businessProfile.count({
        where: { ...where, onboardingCompletedAt: null },
      }),
    ]);

    return NextResponse.json({
      businesses: businesses.map((b) => ({
        ...b,
        onboardingCompletedAt: b.onboardingCompletedAt?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),
      })),
      stats: { active, inactive, pendingOnboarding },
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin businesses GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
