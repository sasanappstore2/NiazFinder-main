import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'comms:notifications:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type')?.trim() || '';
    const userId = searchParams.get('userId')?.trim() || '';

    const where: Prisma.NotificationWhereInput = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { message: { contains: q } },
        { user: { phone: { contains: q } } },
      ];
    }

    const [total, notifications] = await Promise.all([
      db.notification.count({ where }),
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          message: true,
          data: true,
          isRead: true,
          readAt: true,
          createdAt: true,
          user: {
            select: { id: true, phone: true, displayName: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt?.toISOString() ?? null,
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin notifications GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
