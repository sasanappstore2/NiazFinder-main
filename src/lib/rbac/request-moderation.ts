import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { ModerationStatus, RequestStatus } from '@prisma/client';
import { scheduleNeedLeadOutreach } from '@/lib/need-leads/schedule';
import { enqueueVipBroadcast } from '@/lib/smart-matching/enqueue-vip-broadcast';
import { isSmartMatchingEnabled } from '@/lib/smart-matching/env';
import { logModerationAudit } from '@/lib/rbac/moderation-audit';
import { notifyNeedBrowseAlertsForRequest } from '@/lib/need-alerts/notify';
export type ModerationAction = 'approve' | 'reject_soft' | 'reject_final';

export function parseModerationAction(value: unknown): ModerationAction | null {
  if (value === 'approve' || value === 'reject_soft' || value === 'reject_final') return value;
  return null;
}

export async function applyModerationAction(
  requestId: string,
  action: ModerationAction,
  actorUserId: string,
  options?: { reason?: string; notes?: string; ip?: string; userAgent?: string }
) {
  const existing = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, moderationStatus: true, status: true },
  });

  if (!existing) {
    return { ok: false as const, error: 'نیاز یافت نشد', status: 404 };
  }

  const now = new Date();
  let moderationStatus: ModerationStatus;
  let status: RequestStatus;

  switch (action) {
    case 'approve':
      moderationStatus = 'APPROVED';
      status = 'OPEN';
      break;
    case 'reject_soft':
      moderationStatus = 'REJECTED_SOFT';
      status = 'REJECTED';
      break;
    case 'reject_final':
      moderationStatus = 'REJECTED_FINAL';
      status = 'CANCELLED';
      break;
  }

  const updated = await db.serviceRequest.update({
    where: { id: requestId },
    data: {
      moderationStatus,
      status,
      reviewedAt: now,
      reviewedByUserId: actorUserId,
      rejectionReason: action.startsWith('reject') ? options?.reason ?? null : null,
      moderationNotes: options?.notes ?? null,
      assignedToUserId: null,
    },
    select: { id: true, title: true, slug: true, moderationStatus: true, status: true },
  });

  await logModerationAudit({
    actorUserId,
    action: `request.moderate.${action}`,
    entityId: requestId,
    payload: {
      reason: options?.reason,
      notes: options?.notes,
      previousStatus: existing.status,
      previousModerationStatus: existing.moderationStatus,
      nextStatus: status,
      nextModerationStatus: moderationStatus,
    },
    ip: options?.ip,
    userAgent: options?.userAgent,
  });

  if (action === 'approve') {
    if (isSmartMatchingEnabled()) {
      void enqueueVipBroadcast(requestId);
    } else {
      scheduleNeedLeadOutreach(requestId);
    }
    void notifyNeedBrowseAlertsForRequest(requestId).catch((err) =>
      console.error('need browse alert notify failed', err)
    );
  }


  return { ok: true as const, request: updated };
}

export async function applyUnpublishAction(
  requestId: string,
  actorUserId: string,
  options?: { ip?: string; userAgent?: string }
) {
  const existing = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, moderationStatus: true, status: true },
  });

  if (!existing) {
    return { ok: false as const, error: 'نیاز یافت نشد', status: 404 };
  }

  const updated = await db.serviceRequest.update({
    where: { id: requestId },
    data: {
      moderationStatus: 'PENDING',
      status: 'PENDING_REVIEW',
      reviewedAt: null,
      reviewedByUserId: null,
      rejectionReason: null,
      assignedToUserId: null,
    },
    select: { id: true, title: true, slug: true, moderationStatus: true, status: true },
  });

  await logModerationAudit({
    actorUserId,
    action: 'request.unpublish',
    entityId: requestId,
    payload: {
      previousStatus: existing.status,
      previousModerationStatus: existing.moderationStatus,
      nextStatus: 'PENDING_REVIEW',
      nextModerationStatus: 'PENDING',
    },
    ip: options?.ip,
    userAgent: options?.userAgent,
  });

  return { ok: true as const, request: updated };
}

export async function applyAdminDeleteAction(
  requestId: string,
  actorUserId: string,
  options?: { ip?: string; userAgent?: string }
) {
  const existing = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, moderationStatus: true, status: true, title: true },
  });

  if (!existing) {
    return { ok: false as const, error: 'نیاز یافت نشد', status: 404 };
  }

  const now = new Date();
  const updated = await db.serviceRequest.update({
    where: { id: requestId },
    data: {
      status: 'CANCELLED',
      moderationStatus: 'REJECTED_FINAL',
      reviewedAt: now,
      reviewedByUserId: actorUserId,
      assignedToUserId: null,
    },
    select: { id: true, title: true, slug: true, moderationStatus: true, status: true },
  });

  await logModerationAudit({
    actorUserId,
    action: 'request.admin.delete',
    entityId: requestId,
    payload: {
      previousStatus: existing.status,
      previousModerationStatus: existing.moderationStatus,
      title: existing.title,
    },
    ip: options?.ip,
    userAgent: options?.userAgent,
  });

  return { ok: true as const, request: updated };
}

export function getClientMeta(request: NextRequest) {
  return {
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  };
}
