import { db } from '@/lib/db';

export async function logModerationAudit({
  actorUserId,
  action,
  entityId,
  payload,
  ip,
  userAgent,
}: {
  actorUserId: string;
  action: string;
  entityId: string;
  payload?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  await db.adminAuditLog.create({
    data: {
      actorUserId,
      action,
      entityType: 'ServiceRequest',
      entityId,
      payload: JSON.stringify(payload ?? {}),
      ip: ip ?? undefined,
      userAgent: userAgent ?? undefined,
    },
  });
}
