import type { AuthUser } from '@/lib/auth';
import { normalizeIranMobile, toAsciiDigits } from '@/lib/format/digits';

export const SUPER_ADMIN_PHONE = '09374333028';

export function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  const normalized = normalizeIranMobile(phone);
  if (normalized) return normalized;
  return toAsciiDigits(phone);
}

export function isSuperAdminPhone(phone?: string | null): boolean {
  return normalizePhone(phone) === SUPER_ADMIN_PHONE;
}

export function isAllowedSuperAdmin(user: AuthUser | null): user is AuthUser {
  return Boolean(user && user.role === 'SUPER_ADMIN' && isSuperAdminPhone(user.phone));
}
