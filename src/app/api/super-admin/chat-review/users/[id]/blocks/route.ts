import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'comms:messages:read');
    if (!authz.ok) return authz.response;

    const { id: userId } = await params;
    const { page, limit, skip } = parseAdminListQuery(request, { maxLimit: 100 });

    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const where = {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    };

    const [total, blocks] = await Promise.all([
      db.userBlock.count({ where }),
      db.userBlock.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          blockerId: true,
          blockedId: true,
          createdAt: true,
          blocker: {
            select: { id: true, phone: true, displayName: true },
          },
          blocked: {
            select: { id: true, phone: true, displayName: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      blocks: blocks.map((b) => ({
        ...b,
        createdAt: b.createdAt.toISOString(),
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin user blocks GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
