import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getLocationStats, readManagedLocationData } from '@/lib/admin-locations';
import { isAllowedSuperAdmin } from '@/lib/super-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!isAllowedSuperAdmin(authUser)) {
      return NextResponse.json(
        { error: 'این بخش فقط برای سوپرادمین اصلی فعال است' },
        { status: 403 }
      );
    }

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
      db.category.count({ where: { isActive: false } }),
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
        locations: getLocationStats(locations),
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
