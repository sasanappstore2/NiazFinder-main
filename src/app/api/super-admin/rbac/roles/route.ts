import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureStaffPermissions } from '@/lib/rbac/ensure-staff-permissions';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';

export const runtime = 'nodejs';

type RolePayload = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  permissionIds?: string[];
};

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'rbac:roles:read');
    if (!authz.ok) return authz.response;

    await ensureStaffPermissions();

    const roles = await db.staffRole.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isActive: r.isActive,
        userCount: r._count.users,
        permissionIds: r.permissions.map((p) => p.permissionId),
        permissions: r.permissions.map((p) => p.permission),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    console.error('RBAC roles GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'rbac:roles:write');
    if (!authz.ok) return authz.response;

    await ensureStaffPermissions();

    const body: RolePayload = await request.json();
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: 'نام نقش الزامی است' }, { status: 400 });

    const permissionIds = Array.isArray(body.permissionIds) ? body.permissionIds : [];
    const uniquePermissionIds = [...new Set(permissionIds.map((id) => String(id)))];

    const role = await db.staffRole.create({
      data: {
        name,
        description: body.description?.trim() || null,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
        permissions: {
          create: uniquePermissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    await logAdminAction(request, authz.user.id, 'rbac.role.create', 'StaffRole', role.id, {
      name: role.name,
      isActive: role.isActive,
      permissionIds: uniquePermissionIds,
    });

    return NextResponse.json(
      {
        role: {
          id: role.id,
          name: role.name,
          description: role.description,
          isActive: role.isActive,
          userCount: role._count.users,
          permissionIds: role.permissions.map((p) => p.permissionId),
          permissions: role.permissions.map((p) => p.permission),
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('RBAC roles POST error:', error);
    const message = error instanceof Error ? error.message : 'خطای سرور رخ داده است';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

