import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:workflow:read');
    if (!authz.ok) return authz.response;

    const [
      pendingRequests,
      pendingReports,
      reviewingReports,
      pendingProposals,
      failedOutreach,
      queuedOutreach,
      pendingVoiceCalls,
      inactiveBusinesses,
      unpublishedReviews,
      pendingTransactions,
      bannedUsers,
      unreadMessages,
    ] = await Promise.all([
      db.serviceRequest.count({ where: { moderationStatus: 'PENDING' } }),
      db.report.count({ where: { status: 'PENDING' } }),
      db.report.count({ where: { status: 'REVIEWING' } }),
      db.proposal.count({ where: { status: 'PENDING' } }),
      db.needLeadOutreach.count({ where: { status: 'FAILED' } }),
      db.needLeadOutreach.count({ where: { status: 'QUEUED' } }),
      db.voiceCall.count({
        where: { status: { in: ['INITIATED', 'RINGING', 'ACTIVE'] } },
      }),
      db.businessProfile.count({ where: { status: 'INACTIVE', verified: false } }),
      db.review.count({ where: { isPublished: false } }),
      db.transaction.count({ where: { status: 'PENDING' } }),
      db.user.count({ where: { isBanned: true } }),
      db.message.count({ where: { isRead: false, deletedAt: null } }),
    ]);

    return NextResponse.json({
      counts: {
        pendingRequests,
        pendingReports,
        reviewingReports,
        pendingProposals,
        failedOutreach,
        queuedOutreach,
        pendingVoiceCalls,
        inactiveBusinesses,
        unpublishedReviews,
        pendingTransactions,
        bannedUsers,
        unreadMessages,
        totalQueue:
          pendingRequests +
          pendingReports +
          pendingProposals +
          failedOutreach +
          queuedOutreach,
      },
    });
  } catch (error) {
    console.error('Super admin workflow GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
