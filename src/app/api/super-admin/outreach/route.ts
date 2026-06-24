import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import type { NeedLeadOutreachStatus, Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:outreach:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q, status } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId')?.trim() || '';
    const businessProfileId = searchParams.get('businessProfileId')?.trim() || '';

    const where: Prisma.NeedLeadOutreachWhereInput = {};
    if (status) where.status = status as NeedLeadOutreachStatus;
    if (requestId) where.requestId = requestId;
    if (businessProfileId) where.businessProfileId = businessProfileId;
    if (q) {
      where.OR = [
        { matchReasonFa: { contains: q } },
        { skipReason: { contains: q } },
        { business: { name: { contains: q } } },
        { request: { title: { contains: q } } },
      ];
    }

    const [total, outreach] = await Promise.all([
      db.needLeadOutreach.count({ where }),
      db.needLeadOutreach.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          requestId: true,
          businessProfileId: true,
          businessUserId: true,
          matchScore: true,
          matchReasonFa: true,
          status: true,
          skipReason: true,
          conversationId: true,
          createdAt: true,
          updatedAt: true,
          request: {
            select: { id: true, title: true, slug: true, status: true },
          },
          business: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      outreach: outreach.map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin outreach GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
