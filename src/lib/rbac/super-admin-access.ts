import type { AuthUser } from '@/lib/auth';
import { isSuperAdminPhone } from '@/lib/super-admin';

/** Owner SUPER_ADMIN (phone-locked) — full platform access. */
export function isSuperAdminOwner(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN' && isSuperAdminPhone(user.phone);
}

/** Client-safe check using role + permission list (matches `/api/super-admin/me`). */
export function hasSuperAdminPanelAccessFromRoleAndPermissions(
  role: AuthUser['role'],
  phone: string | null | undefined,
  permissions: Iterable<string>
): boolean {
  if (role === 'SUPER_ADMIN' && isSuperAdminPhone(phone)) return true;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return true;
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  if (set.has('*') || set.has('superadmin:access')) return true;
  return set.size > 0;
}

/** Same rules as `/api/super-admin/me` — owner, wildcard, or any staff RBAC permission. */
export function hasSuperAdminPanelAccess(
  user: AuthUser,
  permissions: Iterable<string>
): boolean {
  return hasSuperAdminPanelAccessFromRoleAndPermissions(user.role, user.phone, permissions);
}
