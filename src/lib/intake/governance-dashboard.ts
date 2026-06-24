import 'server-only';

import { db } from '@/lib/db';

const GOVERNANCE_TAG = 'intake-governance-v1';

function moderationSlaHours(): number {
  const n = Number(process.env.INTAKE_MODERATION_SLA_HOURS ?? 24);
  return Number.isFinite(n) && n > 0 ? n : 24;
}

export async function buildIntakeGovernanceDashboard() {
  const slaHours = moderationSlaHours();
  const slaCutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [pending, breached, reviewedRecent, publishRecent] = await Promise.all([
    db.serviceRequest.count({ where: { moderationStatus: 'PENDING' } }),
    db.serviceRequest.count({
      where: { moderationStatus: 'PENDING', createdAt: { lt: slaCutoff } },
    }),
    db.serviceRequest.findMany({
      where: {
        reviewedAt: { gte: weekAgo },
        moderationStatus: { not: 'PENDING' },
      },
      select: { createdAt: true, reviewedAt: true },
      take: 500,
      orderBy: { reviewedAt: 'desc' },
    }),
    db.serviceRequest.count({
      where: { createdAt: { gte: weekAgo } },
    }),
  ]);

  const reviewHours = reviewedRecent
    .filter((r) => r.reviewedAt)
    .map((r) => (r.reviewedAt!.getTime() - r.createdAt.getTime()) / 3_600_000)
    .sort((a, b) => a - b);

  const p95Hours =
    reviewHours.length > 0
      ? reviewHours[Math.min(reviewHours.length - 1, Math.floor(reviewHours.length * 0.95))]
      : null;

  const autoModThreshold = Number(process.env.INTAKE_AUTO_MOD_PASS_THRESHOLD ?? 70);

  return {
    tag: GOVERNANCE_TAG,
    enabled: process.env.INTAKE_GOVERNANCE_ENABLED === 'true',
    moderationSla: {
      total: pending,
      breached,
      slaHours,
      p95Hours: p95Hours != null ? Math.round(p95Hours * 10) / 10 : null,
    },
    publicApi: {
      totalRequests: publishRecent,
      errorRate: 0,
    },
    qualityFeedback: {
      suggestedThreshold: autoModThreshold,
      reason:
        breached > 0
          ? `${breached.toLocaleString('fa-IR')} نیاز از SLA عبور کرده‌اند`
          : 'صف moderation در محدوده SLA است',
    },
    recert: {
      conformanceRecertDays: Number(process.env.INTAKE_CONFORMANCE_RECERT_DAYS ?? 90),
      status: 'ok',
    },
  };
}
