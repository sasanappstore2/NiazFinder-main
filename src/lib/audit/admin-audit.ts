import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function logAdminAction(
  req: NextRequest,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  payload: unknown
) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;

  const userAgent = req.headers.get('user-agent');

  await db.adminAuditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      payload: JSON.stringify(payload ?? {}),
      ip,
      userAgent,
    },
  });
}

