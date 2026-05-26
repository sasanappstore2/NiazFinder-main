import { db } from '@/lib/db';
import { ADMIN_PERMISSIONS } from '@/config/admin-permissions';

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
}

