import type { AuthUser } from '@/lib/auth';

export const SUPER_ADMIN_PHONE = '09374333028';

export function normalizePhone(phone?: string | null): string {
  if (!phone) return '';

  const digits = phone.replace(/[^\d+]/g, '');

  if (digits.startsWith('+98')) {
    return `0${digits.slice(3)}`;
  }

  if (digits.startsWith('98') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

export function isSuperAdminPhone(phone?: string | null): boolean {
  return normalizePhone(phone) === SUPER_ADMIN_PHONE;
}

export function isAllowedSuperAdmin(user: AuthUser | null): user is AuthUser {
  return Boolean(user && user.role === 'SUPER_ADMIN' && isSuperAdminPhone(user.phone));
}
