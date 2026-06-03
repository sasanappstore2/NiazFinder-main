import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, type AuthUser } from '@/lib/auth';
import { isSuperAdminPhone } from '@/lib/super-admin';
import type { AdminPermissionId } from '@/config/admin-permissions';
import { permissionSatisfied } from '@/lib/rbac/permission-check';

export type AuthzResult =
  | { ok: true; user: AuthUser; permissions: Set<string> }
  | { ok: false; response: NextResponse };

async function loadUserPermissionIds(userId: string): Promise<Set<string>> {
  const rows = await db.userStaffRole.findMany({
    where: { userId, role: { isActive: true } },
    select: {
      role: {
        select: {
          permissions: { select: { permissionId: true } },
        },
      },
    },
  });

  const ids = new Set<string>();
  for (const row of rows) {
    for (const p of row.role.permissions) ids.add(p.permissionId);
  }
  return ids;
}

/**
 * Authorization helper:
 * - Owner SUPER_ADMIN (phone locked) => full access.
 * - Others => must have StaffRole permissions assigned (RBAC).
 */
export async function authorize(request: NextRequest): Promise<AuthzResult> {
  const user = await getAuthUser(request);
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const isOwner = user.role === 'SUPER_ADMIN' && isSuperAdminPhone(user.phone);
  if (isOwner) {
    return { ok: true, user, permissions: new Set<string>(['*']) };
  }

  const permissions = await loadUserPermissionIds(user.id);
  return { ok: true, user, permissions };
}

export async function requirePermission(
  request: NextRequest,
  permission: AdminPermissionId
): Promise<AuthzResult> {
  const authz = await authorize(request);
  if (!authz.ok) return authz;

  if (authz.permissions.has('*') || permissionSatisfied(authz.permissions, permission)) return authz;

  return {
    ok: false,
    response: NextResponse.json({ error: 'دسترسی کافی ندارید' }, { status: 403 }),
  };
}

