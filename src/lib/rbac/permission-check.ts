import type { AdminPermissionId } from '@/config/admin-permissions';

/** Permissions that also satisfy the required permission (read/write pairs). */
const PERMISSION_ALIASES: Partial<Record<AdminPermissionId, readonly AdminPermissionId[]>> = {
  'taxonomy:business-occupations:read': ['taxonomy:categories:read', 'taxonomy:online-stores:read'],
  'taxonomy:business-occupations:write': ['taxonomy:categories:write', 'taxonomy:online-stores:write'],
  'taxonomy:online-stores:read': ['taxonomy:categories:read', 'taxonomy:business-occupations:read'],
  'taxonomy:online-stores:write': ['taxonomy:categories:write', 'taxonomy:business-occupations:write'],
  'taxonomy:categories:read': ['taxonomy:business-occupations:read', 'taxonomy:online-stores:read'],
  'taxonomy:categories:write': ['taxonomy:business-occupations:write', 'taxonomy:online-stores:write'],
};

export function permissionSatisfied(
  permissions: Iterable<string>,
  required: AdminPermissionId
): boolean {
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  if (set.has('*') || set.has(required)) return true;
  return PERMISSION_ALIASES[required]?.some((alias) => set.has(alias)) ?? false;
}

export function anyPermissionSatisfied(
  permissions: Iterable<string>,
  required: AdminPermissionId | AdminPermissionId[]
): boolean {
  const list = Array.isArray(required) ? required : [required];
  return list.some((p) => permissionSatisfied(permissions, p));
}
