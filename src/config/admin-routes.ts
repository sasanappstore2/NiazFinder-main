import type { AdminPermissionId } from '@/config/admin-permissions';

export type AdminSectionId =
  | 'overview'
  | 'analytics'
  | 'categories'
  | 'locations'
  | 'requests'
  | 'businesses'
  | 'users'
  | 'messages'
  | 'system'
  | 'settings';

export const ADMIN_SECTION_ROUTES: Record<AdminSectionId, string> = {
  overview: '/super-admin',
  analytics: '/super-admin/analytics',
  categories: '/super-admin/categories',
  locations: '/super-admin/locations',
  requests: '/super-admin/requests',
  businesses: '/super-admin/businesses',
  users: '/super-admin/users',
  messages: '/super-admin/messages',
  system: '/super-admin/system',
  settings: '/super-admin/settings',
};

export const ADMIN_ROUTE_TO_SECTION: Record<string, AdminSectionId> = {
  '': 'overview',
  analytics: 'analytics',
  categories: 'categories',
  locations: 'locations',
  requests: 'requests',
  businesses: 'businesses',
  users: 'users',
  messages: 'messages',
  system: 'system',
  settings: 'settings',
};

export const ADMIN_SECTION_PERMISSIONS: Record<AdminSectionId, AdminPermissionId> = {
  overview: 'superadmin:overview:read',
  analytics: 'superadmin:analytics:read',
  categories: 'taxonomy:categories:read',
  locations: 'geo:locations:read',
  requests: 'market:requests:read',
  businesses: 'market:businesses:read',
  users: 'crm:users:read',
  messages: 'comms:messages:read',
  system: 'rbac:roles:read',
  settings: 'ops:settings:write',
};

export function sectionFromPathname(pathname: string): AdminSectionId {
  const segment = pathname.replace(/^\/super-admin\/?/, '').split('/')[0] ?? '';
  return ADMIN_ROUTE_TO_SECTION[segment] ?? 'overview';
}

export function routeForSection(section: AdminSectionId): string {
  return ADMIN_SECTION_ROUTES[section];
}

/** Nav visibility — dashboard accepts overview or analytics permission */
export function canAccessAdminNavItem(
  itemId: string,
  hasPermission: (id: AdminPermissionId) => boolean
): boolean {
  if (itemId === 'overview') {
    return hasPermission('superadmin:overview:read') || hasPermission('superadmin:analytics:read');
  }
  if (itemId === 'intake-migration' || itemId === 'intake-ai-evaluation') {
    return hasPermission('ops:intake-migration:read');
  }
  if (itemId === 'intake-training') {
    return hasPermission('ops:intake-training:read');
  }
  const section = itemId as AdminSectionId;
  if (section in ADMIN_SECTION_PERMISSIONS) {
    return hasPermission(ADMIN_SECTION_PERMISSIONS[section]);
  }
  return true;
}

/** Maps admin route section to internal SuperAdminDashboard section id */
export function toDashboardSection(section: AdminSectionId): string {
  if (section === 'users') return 'crm';
  return section;
}
