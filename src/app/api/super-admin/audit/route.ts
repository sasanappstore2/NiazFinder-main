import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'audit:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action')?.trim() || '';
    const entityType = searchParams.get('entityType')?.trim() || '';
    const actorUserId = searchParams.get('actorUserId')?.trim() || '';
    const from = searchParams.get('from')?.trim() || '';
    const to = searchParams.get('to')?.trim() || '';

    const where: Record<string, unknown> = {};
    if (action) where.action = { contains: action };
    if (entityType) where.entityType = entityType;
    if (actorUserId) where.actorUserId = actorUserId;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (q) {
      where.OR = [
        { action: { contains: q } },
        { entityType: { contains: q } },
        { entityId: { contains: q } },
        { actor: { phone: { contains: q } } },
        { actor: { displayName: { contains: q } } },
      ];
    }

    const [total, logs] = await Promise.all([
      db.adminAuditLog.count({ where }),
      db.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          payload: true,
          ip: true,
          createdAt: true,
          actor: {
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
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin audit GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
