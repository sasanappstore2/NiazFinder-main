import type { AuthUser } from '@/lib/auth';
import { normalizeIranMobile, toAsciiDigits } from '@/lib/format/digits';

/** @deprecated use getSuperAdminPhones() — configure SUPER_ADMIN_PHONES in env */
export const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE?.trim() || '';

function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  const normalized = normalizeIranMobile(phone);
  if (normalized) return normalized;
  return toAsciiDigits(phone);
}

/** Comma-separated list from SUPER_ADMIN_PHONES env, with legacy single-phone fallback. */
export function getSuperAdminPhones(): string[] {
  const raw = process.env.SUPER_ADMIN_PHONES?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((p) => normalizePhone(p.trim()))
      .filter(Boolean);
  }
  const single = normalizePhone(process.env.SUPER_ADMIN_PHONE?.trim() || SUPER_ADMIN_PHONE);
  return single ? [single] : [];
}

export { normalizePhone };

export function isSuperAdminPhone(phone?: string | null): boolean {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  return getSuperAdminPhones().includes(normalized);
}

export function isAllowedSuperAdmin(user: AuthUser | null): user is AuthUser {
  return Boolean(user && user.role === 'SUPER_ADMIN' && isSuperAdminPhone(user.phone));
}

type AppUserRole = AuthUser['role'];

/** Promote owner phone to SUPER_ADMIN; demote stale SUPER_ADMIN when phone is not owner. */
export function resolveSuperAdminRoleUpdate(
  phone: string | null | undefined,
  currentRole: AppUserRole
): AppUserRole | null {
  if (isSuperAdminPhone(phone)) {
    return currentRole === 'SUPER_ADMIN' ? null : 'SUPER_ADMIN';
  }
  if (currentRole === 'SUPER_ADMIN') {
    return 'CLIENT';
  }
  return null;
}
