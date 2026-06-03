import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import type { Prisma, ReportStatus } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'content:reports:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q, status } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType')?.trim() || '';

    const where: Prisma.ReportWhereInput = {};
    if (status) where.status = status as ReportStatus;
    if (targetType) where.targetType = targetType;
    if (q) {
      where.OR = [
        { reason: { contains: q } },
        { description: { contains: q } },
        { targetId: { contains: q } },
        { targetType: { contains: q } },
      ];
    }

    const [total, reports] = await Promise.all([
      db.report.count({ where }),
      db.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      reports: reports.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin reports GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
