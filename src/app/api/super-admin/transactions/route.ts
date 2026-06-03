import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import type { Prisma, TransactionStatus, TransactionType } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'billing:transactions:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q, status } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type')?.trim() || '';
    const userId = searchParams.get('userId')?.trim() || '';

    const where: Prisma.TransactionWhereInput = {};
    if (status) where.status = status as TransactionStatus;
    if (type) where.type = type as TransactionType;
    if (userId) where.userId = userId;
    if (q) {
      where.OR = [
        { description: { contains: q } },
        { referenceId: { contains: q } },
        { user: { phone: { contains: q } } },
      ];
    }

    const [total, transactions] = await Promise.all([
      db.transaction.count({ where }),
      db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          walletId: true,
          userId: true,
          type: true,
          amount: true,
          description: true,
          referenceId: true,
          status: true,
          createdAt: true,
          user: {
            select: { id: true, phone: true, displayName: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin transactions GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
