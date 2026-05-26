import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';

export const runtime = 'nodejs';

type AssignmentPayload = {
  userId?: string;
  roleIds?: string[];
};

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'rbac:assignments:write');
    if (!authz.ok) return authz.response;

    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'شناسه کاربر الزامی است' }, { status: 400 });
    }

    const assignments = await db.userStaffRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      userId,
      roleIds: assignments.map((a) => a.roleId),
      roles: assignments.map((a) => ({ id: a.role.id, name: a.role.name, isActive: a.role.isActive })),
    });
  } catch (error) {
    console.error('RBAC assignments GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'rbac:assignments:write');
    if (!authz.ok) return authz.response;

    const body: AssignmentPayload = await request.json();
    const userId = body.userId;
    if (!userId) return NextResponse.json({ error: 'شناسه کاربر الزامی است' }, { status: 400 });

    const roleIds = Array.isArray(body.roleIds) ? body.roleIds.map((x) => String(x)) : [];
    const uniqueRoleIds = [...new Set(roleIds)];

    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

    const roles = await db.staffRole.findMany({ where: { id: { in: uniqueRoleIds } }, select: { id: true } });
    const foundRoleIds = new Set(roles.map((r) => r.id));
    const missing = uniqueRoleIds.filter((id) => !foundRoleIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json({ error: `نقش(ها) یافت نشد: ${missing.join(', ')}` }, { status: 400 });
    }

    await db.userStaffRole.deleteMany({ where: { userId } });
    if (uniqueRoleIds.length > 0) {
      await db.userStaffRole.createMany({
        data: uniqueRoleIds.map((roleId) => ({ userId, roleId })),
      });
    }

    const assignments = await db.userStaffRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });

    await logAdminAction(request, authz.user.id, 'rbac.assignments.set', 'User', userId, {
      roleIds: uniqueRoleIds,
    });

    return NextResponse.json({
      userId,
      roles: assignments.map((a) => ({ id: a.role.id, name: a.role.name, isActive: a.role.isActive })),
    });
  } catch (error) {
    console.error('RBAC assignments POST error:', error);
    const message = error instanceof Error ? error.message : 'خطای سرور رخ داده است';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

