import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { clientIp } from '@/lib/security/rate-limit';

export async function writeStaffAuditLog(opts: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  request?: NextRequest;
}) {
  try {
    await db.staffAuditLog.create({
      data: {
        actorUserId: opts.actorUserId,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        payload: JSON.stringify(opts.payload ?? {}),
        ip: opts.request ? clientIp(opts.request) : undefined,
        userAgent: opts.request?.headers.get('user-agent') ?? undefined,
      },
    });
  } catch (e) {
    console.warn('[staff-audit] write failed:', e);
  }
}
