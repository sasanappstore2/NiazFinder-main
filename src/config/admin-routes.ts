import type { AdminPermissionId } from '@/config/admin-permissions';
import { permissionSatisfied } from '@/lib/rbac/permission-check';

export type AdminSectionId =
  | 'overview'
  | 'analytics'
  | 'workflow'
  | 'categories'
  | 'business-occupations'
  | 'online-stores'
  | 'locations'
  | 'requests'
  | 'proposals'
  | 'businesses'
  | 'outreach'
  | 'filings'
  | 'need-alerts'
  | 'users'
  | 'reports'
  | 'messages'
  | 'voice-calls'
  | 'notifications'
  | 'reviews'
  | 'billing'
  | 'system'
  | 'audit'
  | 'files'
  | 'settings'
  | 'referrals'
  | 'coupons'
  | 'blog';

export const ADMIN_SECTION_ROUTES: Record<AdminSectionId, string> = {
  overview: '/super-admin',
  analytics: '/super-admin/analytics',
  workflow: '/super-admin/workflow',
  categories: '/super-admin/categories',
  'business-occupations': '/super-admin/business-occupations',
  'online-stores': '/super-admin/online-stores',
  locations: '/super-admin/locations',
  requests: '/super-admin/requests',
  proposals: '/super-admin/proposals',
  businesses: '/super-admin/businesses',
  outreach: '/super-admin/outreach',
  filings: '/super-admin/filings',
  'need-alerts': '/super-admin/need-alerts',
  users: '/super-admin/users',
  reports: '/super-admin/reports',
  messages: '/super-admin/messages',
  'voice-calls': '/super-admin/voice-calls',
  notifications: '/super-admin/notifications',
  reviews: '/super-admin/reviews',
  billing: '/super-admin/billing',
  system: '/super-admin/system',
  audit: '/super-admin/audit',
  files: '/super-admin/files',
  settings: '/super-admin/settings',
  referrals: '/super-admin/referrals',
  coupons: '/super-admin/coupons',
  blog: '/super-admin/blog',
};

export const ADMIN_ROUTE_TO_SECTION: Record<string, AdminSectionId> = {
  '': 'overview',
  analytics: 'analytics',
  workflow: 'workflow',
  categories: 'categories',
  'business-occupations': 'business-occupations',
  'online-stores': 'online-stores',
  locations: 'locations',
  requests: 'requests',
  proposals: 'proposals',
  businesses: 'businesses',
  outreach: 'outreach',
  filings: 'filings',
  'need-alerts': 'need-alerts',
  users: 'users',
  reports: 'reports',
  messages: 'messages',
  'voice-calls': 'voice-calls',
  notifications: 'notifications',
  reviews: 'reviews',
  billing: 'billing',
  system: 'system',
  audit: 'audit',
  files: 'files',
  settings: 'settings',
  referrals: 'referrals',
  coupons: 'coupons',
  blog: 'blog',
};

export const ADMIN_SECTION_PERMISSIONS: Record<AdminSectionId, AdminPermissionId> = {
  overview: 'superadmin:overview:read',
  analytics: 'superadmin:analytics:read',
  workflow: 'ops:workflow:read',
  categories: 'taxonomy:categories:read',
  'business-occupations': 'taxonomy:business-occupations:read',
  'online-stores': 'taxonomy:online-stores:read',
  locations: 'geo:locations:read',
  requests: 'market:requests:read',
  proposals: 'market:proposals:read',
  businesses: 'market:businesses:read',
  outreach: 'market:outreach:read',
  filings: 'market:filings:read',
  'need-alerts': 'market:alerts:read',
  users: 'crm:users:read',
  reports: 'content:reports:read',
  messages: 'comms:messages:read',
  'voice-calls': 'comms:voice:read',
  notifications: 'comms:notifications:read',
  reviews: 'content:reviews:read',
  billing: 'billing:transactions:read',
  system: 'rbac:roles:read',
  audit: 'audit:read',
  files: 'ops:files:read',
  settings: 'ops:settings:write',
  referrals: 'growth:referrals:read',
  coupons: 'growth:coupons:read',
  blog: 'content:blog:read',
};

export function sectionFromPathname(pathname: string): AdminSectionId {
  const trimmed = pathname.replace(/^\/super-admin\/?/, '');
  const parts = trimmed.split('/').filter(Boolean);
  if (parts[0] === 'system' && parts[1]?.startsWith('intake-')) {
    return 'system';
  }
  const segment = parts[0] ?? '';
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
  if (itemId === 'intake-migration') {
    return hasPermission('ops:intake-migration:read');
  }
  if (itemId === 'intake-ai-evaluation') {
    return hasPermission('ops:intake-ai-evaluation:read');
  }
  if (itemId === 'intake-training') {
    return hasPermission('ops:intake-training:read');
  }
  if (itemId === 'intake-field-specs') {
    return hasPermission('ops:intake-field-specs:read');
  }
  const section = itemId as AdminSectionId;
  if (section in ADMIN_SECTION_PERMISSIONS) {
    return hasPermission(ADMIN_SECTION_PERMISSIONS[section]);
  }
  return true;
}

/** Section page access (same rules as nav, with permission aliases). */
export function canAccessAdminSection(
  section: AdminSectionId,
  permissions: Iterable<string>
): boolean {
  if (section === 'overview') {
    return (
      permissionSatisfied(permissions, 'superadmin:overview:read') ||
      permissionSatisfied(permissions, 'superadmin:analytics:read')
    );
  }
  if (section === 'analytics') {
    return (
      permissionSatisfied(permissions, 'superadmin:analytics:read') ||
      permissionSatisfied(permissions, 'superadmin:overview:read')
    );
  }
  if (section in ADMIN_SECTION_PERMISSIONS) {
    return permissionSatisfied(permissions, ADMIN_SECTION_PERMISSIONS[section]);
  }
  return true;
}

/** Maps admin route section to internal SuperAdminDashboard section id */
export function toDashboardSection(section: AdminSectionId): string {
  if (section === 'users') return 'crm';
  return section;
}
