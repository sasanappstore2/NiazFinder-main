import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getLocationStats, readManagedLocationData } from '@/lib/admin-locations';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:overview:read');
    if (!authz.ok) return authz.response;

    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      totalRequests,
      openRequests,
      totalProposals,
      totalCategories,
      inactiveCategories,
      totalReviews,
      totalTransactions,
      locations,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isActive: true, isBanned: false } }),
      db.user.count({ where: { isBanned: true } }),
      db.serviceRequest.count(),
      db.serviceRequest.count({ where: { status: 'OPEN' } }),
      db.proposal.count(),
      db.category.count(),
      db.category.count({ where: { status: { not: 'ACTIVE' } } }),
      db.review.count(),
      db.transaction.count(),
      readManagedLocationData(),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        totalRequests,
        openRequests,
        totalProposals,
        totalCategories,
        inactiveCategories,
        totalReviews,
        totalTransactions,
        locations: await getLocationStats(locations),
      },
    });
  } catch (error) {
    console.error('Super admin overview error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
