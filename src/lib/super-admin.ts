import type { AuthUser } from '@/lib/auth';
import { normalizeIranMobile, toAsciiDigits } from '@/lib/format/digits';

/** @deprecated use getSuperAdminPhones() — kept for one release */
export const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE?.trim() || '09374333028';

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
  const single = normalizePhone(process.env.SUPER_ADMIN_PHONE || SUPER_ADMIN_PHONE);
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
