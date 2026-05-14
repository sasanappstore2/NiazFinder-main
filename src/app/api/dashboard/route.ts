import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ============ GET handler ============

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const [
      totalRequests,
      activeRequests,
      completedProjects,
      pendingProposals,
      reviewStats,
      proposalStats,
      userProfile,
    ] = await Promise.all([
      // Total requests by the user
      db.serviceRequest.count({
        where: { userId: user.id },
      }),
      // Active requests (OPEN or IN_PROGRESS)
      db.serviceRequest.count({
        where: {
          userId: user.id,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      // Completed projects (requests where user was specialist with accepted proposal)
      db.proposal.count({
        where: {
          userId: user.id,
          status: 'ACCEPTED',
          request: { status: { in: ['COMPLETED', 'IN_PROGRESS'] } },
        },
      }),
      // Pending proposals
      db.proposal.count({
        where: {
          userId: user.id,
          status: 'PENDING',
        },
      }),
      // Avg rating received
      db.review.aggregate({
        where: { userId: user.id },
        _avg: { rating: true },
      }),
      // Response rate: proposals with any response / total proposals
      db.proposal.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: true,
      }),
      // User profile for completion check
      db.user.findUnique({
        where: { id: user.id },
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
          bio: true,
          city: true,
          province: true,
          phone: true,
          avatar: true,
        },
      }),
    ]);

    // Compute response rate (accepted + rejected / total)
    const totalProposalEntries = proposalStats.reduce((sum, p) => sum + p._count, 0);
    const respondedProposals = proposalStats
      .filter((p) => p.status === 'ACCEPTED' || p.status === 'REJECTED')
      .reduce((sum, p) => sum + p._count, 0);
    const responseRate = totalProposalEntries > 0
      ? Math.round((respondedProposals / totalProposalEntries) * 100)
      : 0;

    // Compute profile completion
    let profileFields = 0;
    const totalProfileFields = 8;
    if (userProfile) {
      if (userProfile.firstName?.trim()) profileFields++;
      if (userProfile.lastName?.trim()) profileFields++;
      if (userProfile.displayName?.trim()) profileFields++;
      if (userProfile.bio?.trim()) profileFields++;
      if (userProfile.city?.trim()) profileFields++;
      if (userProfile.province?.trim()) profileFields++;
      if (userProfile.phone?.trim()) profileFields++;
      if (userProfile.avatar?.trim()) profileFields++;
    }
    const profileCompletion = Math.round((profileFields / totalProfileFields) * 100);

    // Total earnings: sum of accepted proposal prices
    const earningsResult = await db.proposal.aggregate({
      where: {
        userId: user.id,
        status: 'ACCEPTED',
      },
      _sum: { price: true },
    });

    const result = {
      totalRequests,
      activeRequests,
      completedProjects,
      totalEarnings: earningsResult._sum.price || 0,
      pendingProposals,
      avgRating: reviewStats._avg.rating
        ? Math.round(reviewStats._avg.rating * 10) / 10
        : 0,
      responseRate,
      profileCompletion,
    };

    return NextResponse.json({ stats: result });
  } catch (error) {
    console.error('Dashboard GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
