import type { User } from '@/lib/types';

/** Roles that can use dashboard «کسب‌وکار من» and business/me APIs. */
export function canManageBusinessProfile(
  role: User['role'] | string | undefined
): boolean {
  return role === 'SPECIALIST' || role === 'ADMIN' || role === 'SUPER_ADMIN';
}
