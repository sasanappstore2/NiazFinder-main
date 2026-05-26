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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'rbac:roles:write');
    if (!authz.ok) return authz.response;

    await ensureStaffPermissions();

    const { id } = await params;
    const existing = await db.staffRole.findUnique({
      where: { id },
      include: { permissions: true, _count: { select: { users: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'نقش یافت نشد' }, { status: 404 });

    const body: RolePayload = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: 'نام نقش نمی‌تواند خالی باشد' }, { status: 400 });
      data.name = name;
    }
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    const permissionIds = Array.isArray(body.permissionIds) ? body.permissionIds : null;
    const uniquePermissionIds = permissionIds
      ? [...new Set(permissionIds.map((x) => String(x)))]
      : null;

    const role = await db.staffRole.update({
      where: { id },
      data: {
        ...data,
        ...(uniquePermissionIds
          ? {
              permissions: {
                deleteMany: {},
                create: uniquePermissionIds.map((permissionId) => ({ permissionId })),
              },
            }
          : {}),
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    await logAdminAction(request, authz.user.id, 'rbac.role.update', 'StaffRole', role.id, {
      before: {
        id: existing.id,
        name: existing.name,
        description: existing.description,
        isActive: existing.isActive,
        permissionIds: existing.permissions.map((p) => p.permissionId),
      },
      after: {
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        permissionIds: role.permissions.map((p) => p.permissionId),
      },
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('RBAC roles PATCH error:', error);
    const message = error instanceof Error ? error.message : 'خطای سرور رخ داده است';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'rbac:roles:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const existing = await db.staffRole.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'نقش یافت نشد' }, { status: 404 });

    if (existing._count.users > 0) {
      const role = await db.staffRole.update({
        where: { id },
        data: { isActive: false },
      });
      await logAdminAction(request, authz.user.id, 'rbac.role.deactivate', 'StaffRole', id, {
        reason: 'has_users',
        userCount: existing._count.users,
      });
      return NextResponse.json({
        role,
        mode: 'deactivated',
        message: 'به دلیل داشتن کاربر، نقش به‌جای حذف غیرفعال شد',
      });
    }

    await db.staffRolePermission.deleteMany({ where: { roleId: id } });
    await db.staffRole.delete({ where: { id } });

    await logAdminAction(request, authz.user.id, 'rbac.role.delete', 'StaffRole', id, { mode: 'deleted' });

    return NextResponse.json({ success: true, mode: 'deleted' });
  } catch (error) {
    console.error('RBAC roles DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

