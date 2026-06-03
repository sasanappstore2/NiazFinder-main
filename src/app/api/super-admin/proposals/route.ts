import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import type { Prisma, ProposalStatus } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:proposals:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q, status } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId')?.trim() || '';

    const where: Prisma.ProposalWhereInput = {};
    if (status) where.status = status as ProposalStatus;
    if (requestId) where.requestId = requestId;
    if (q) {
      where.OR = [
        { message: { contains: q } },
        { user: { phone: { contains: q } } },
        { user: { displayName: { contains: q } } },
        { request: { title: { contains: q } } },
      ];
    }

    const [total, proposals] = await Promise.all([
      db.proposal.count({ where }),
      db.proposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          price: true,
          status: true,
          message: true,
          deliveryTime: true,
          deliveryUnit: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          request: {
            select: { id: true, title: true, slug: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      proposals: proposals.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin proposals GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
