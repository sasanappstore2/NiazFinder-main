import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:requests:read');
    if (!authz.ok) return authz.response;

    const today = startOfToday();

    const [pending, reviewedToday, myReviewedToday] = await Promise.all([
      db.serviceRequest.count({ where: { moderationStatus: 'PENDING' } }),
      db.serviceRequest.count({
        where: { reviewedAt: { gte: today }, moderationStatus: { not: 'PENDING' } },
      }),
      db.serviceRequest.count({
        where: {
          reviewedByUserId: authz.user.id,
          reviewedAt: { gte: today },
        },
      }),
    ]);

    return NextResponse.json({
      pending,
      reviewedToday,
      myReviewedToday,
    });
  } catch (error) {
    console.error('Moderation stats error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
