import { db } from '@/lib/db';
import { ADMIN_PERMISSIONS } from '@/config/admin-permissions';

const TAXONOMY_PERMISSION_PAIRS: Array<[string, string]> = [
  ['taxonomy:categories:read', 'taxonomy:business-occupations:read'],
  ['taxonomy:categories:write', 'taxonomy:business-occupations:write'],
  ['taxonomy:categories:read', 'taxonomy:online-stores:read'],
  ['taxonomy:categories:write', 'taxonomy:online-stores:write'],
];

/**
 * Roles with need-category taxonomy permissions also receive business-occupation permissions.
 */
async function syncTaxonomyRolePermissions() {
  for (const [sourceId, targetId] of TAXONOMY_PERMISSION_PAIRS) {
    const roles = await db.staffRolePermission.findMany({
      where: { permissionId: sourceId },
      select: { roleId: true },
    });

    if (roles.length === 0) continue;

    await db.staffRolePermission.createMany({
      data: roles.map(({ roleId }) => ({ roleId, permissionId: targetId })),
      skipDuplicates: true,
    });
  }
}

/**
 * Ensures StaffPermission rows exist for the canonical permission list.
 * Safe to call repeatedly (idempotent via upsert).
 */
export async function ensureStaffPermissions() {
  await Promise.all(
    ADMIN_PERMISSIONS.map((p) =>
      db.staffPermission.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          label: p.label,
          group: p.group,
          description: p.description ?? null,
        },
        update: {
          label: p.label,
          group: p.group,
          description: p.description ?? null,
        },
      })
    )
  );

  await syncTaxonomyRolePermissions();
}
