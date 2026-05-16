import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Personal dashboard stats for a user
   */
  async getUserStats(userId: string) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch user base data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatar: true,
        bio: true,
        city: true,
        province: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const [
      // Requests stats
      totalRequests,
      activeRequests,
      completedProjects,
      // Proposals stats
      totalProposals,
      acceptedProposals,
      // Reviews
      averageRatingResult,
      totalReviews,
      // Wallet
      walletData,
      // Messages
      unreadMessages,
      // Notifications
      unreadNotifications,
      // Skills count
      skillsCount,
      // Portfolio count
      portfolioCount,
    ] = await Promise.all([
      // User's own requests
      this.prisma.serviceRequest.count({ where: { userId } }),
      this.prisma.serviceRequest.count({
        where: { userId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.prisma.serviceRequest.count({
        where: { userId, status: 'COMPLETED' },
      }),
      // User's proposals
      this.prisma.proposal.count({ where: { userId } }),
      this.prisma.proposal.count({
        where: { userId, status: 'ACCEPTED' },
      }),
      // Reviews received
      this.prisma.review.aggregate({
        where: { userId, isPublished: true },
        _avg: { rating: true },
      }),
      this.prisma.review.count({
        where: { userId, isPublished: true },
      }),
      // Wallet
      this.prisma.wallet.findUnique({
        where: { userId },
        select: { balance: true, frozen: true },
      }),
      // Unread messages
      this.prisma.message.count({
        where: {
          conversation: {
            OR: [
              { userId1: userId },
              { userId2: userId },
            ],
          },
          senderId: { not: userId },
          isRead: false,
        },
      }),
      // Unread notifications
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
      // Skills
      this.prisma.userSkill.count({ where: { userId } }),
      // Portfolios
      this.prisma.portfolio.count({ where: { userId } }),
    ]);

    // Earnings from completed payments received
    const earningsResult = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'PAYMENT',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    // Pending payments (frozen in wallet for withdrawals)
    const pendingWithdrawals = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'WITHDRAW',
        status: 'PENDING',
      },
      _sum: { amount: true },
    });

    const totalEarnings = earningsResult._sum.amount || 0;
    const pendingPayments = pendingWithdrawals._sum.amount || 0;
    const averageRating = averageRatingResult._avg.rating
      ? Math.round(averageRatingResult._avg.rating * 10) / 10
      : 0;

    // Success rate for proposals
    const successRate =
      totalProposals > 0
        ? Math.round((acceptedProposals / totalProposals) * 100)
        : 0;

    // Profile completion calculation
    const profileCompletion = this.calculateProfileCompletion(user, {
      skillsCount,
      portfolioCount,
      totalReviews,
      hasWallet: !!walletData,
    });

    // This month's activity
    const thisMonthRequests = await this.prisma.serviceRequest.count({
      where: {
        userId,
        createdAt: { gte: firstDayOfMonth },
      },
    });

    const thisMonthProposals = await this.prisma.proposal.count({
      where: {
        userId,
        createdAt: { gte: firstDayOfMonth },
      },
    });

    return {
      // Request stats
      totalRequests,
      activeRequests,
      completedProjects,
      thisMonthRequests,
      // Proposal stats
      totalProposals,
      acceptedProposals,
      successRate,
      thisMonthProposals,
      // Financial stats
      totalEarnings,
      pendingPayments,
      walletBalance: walletData?.balance || 0,
      walletFrozen: walletData?.frozen || 0,
      walletAvailable: (walletData?.balance || 0) - (walletData?.frozen || 0),
      // Rating stats
      averageRating,
      totalReviews,
      // Profile stats
      profileCompletion,
      skillsCount,
      portfolioCount,
      unreadMessages,
      unreadNotifications,
    };
  }

  /**
   * Admin dashboard stats
   */
  async getAdminStats() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      activeUsers,
      totalRequests,
      openRequests,
      completedRequests,
      newRequestsThisMonth,
      newRequestsLastMonth,
      totalProposals,
      pendingProposals,
      totalSpecialists,
      verifiedSpecialists,
      totalRevenue,
      pendingWithdrawalsAmount,
      totalReviews,
      avgRatingResult,
      totalCoupons,
      activeCoupons,
      pendingReports,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: firstDayOfLastMonth, lt: firstDayOfMonth } },
      }),
      this.prisma.user.count({
        where: { isActive: true, isBanned: false },
      }),
      this.prisma.serviceRequest.count(),
      this.prisma.serviceRequest.count({ where: { status: 'OPEN' } }),
      this.prisma.serviceRequest.count({ where: { status: 'COMPLETED' } }),
      this.prisma.serviceRequest.count({
        where: { createdAt: { gte: firstDayOfMonth } },
      }),
      this.prisma.serviceRequest.count({
        where: { createdAt: { gte: firstDayOfLastMonth, lt: firstDayOfMonth } },
      }),
      this.prisma.proposal.count(),
      this.prisma.proposal.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({ where: { role: 'SPECIALIST' } }),
      this.prisma.user.count({ where: { role: 'SPECIALIST', isVerified: true } }),
      this.prisma.transaction.aggregate({
        where: { type: 'COMMISSION', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'WITHDRAW', status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.review.count({ where: { isPublished: true } }),
      this.prisma.review.aggregate({
        where: { isPublished: true },
        _avg: { rating: true },
      }),
      this.prisma.coupon.count(),
      this.prisma.coupon.count({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    // Top categories
    const topCategories = await this.prisma.serviceRequest.groupBy({
      by: ['categoryId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const categoryIds = topCategories.map((c) => c.categoryId);
    const categories = categoryIds.length > 0
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];

    const topCategoriesWithNames = topCategories.map((tc) => {
      const cat = categories.find((c) => c.id === tc.categoryId);
      return {
        categoryId: tc.categoryId,
        categoryName: cat?.name || 'نامشخص',
        count: tc._count.id,
      };
    });

    // Top cities
    const topCities = await this.prisma.user.groupBy({
      by: ['city'],
      where: { city: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    // Growth metrics
    const userGrowth =
      newUsersLastMonth > 0
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
        : newUsersThisMonth > 0 ? 100 : 0;

    const requestGrowth =
      newRequestsLastMonth > 0
        ? ((newRequestsThisMonth - newRequestsLastMonth) / newRequestsLastMonth) * 100
        : newRequestsThisMonth > 0 ? 100 : 0;

    return {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        active: activeUsers,
        growthPercent: Number(userGrowth.toFixed(1)),
      },
      requests: {
        total: totalRequests,
        open: openRequests,
        completed: completedRequests,
        newThisMonth: newRequestsThisMonth,
        growthPercent: Number(requestGrowth.toFixed(1)),
      },
      proposals: {
        total: totalProposals,
        pending: pendingProposals,
      },
      specialists: {
        total: totalSpecialists,
        verified: verifiedSpecialists,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        pendingWithdrawals: pendingWithdrawalsAmount._sum.amount || 0,
      },
      reviews: {
        total: totalReviews,
        avgRating: avgRatingResult._avg.rating
          ? Number(avgRatingResult._avg.rating.toFixed(1))
          : 0,
      },
      coupons: {
        total: totalCoupons,
        active: activeCoupons,
      },
      reports: {
        pending: pendingReports,
      },
      topCategories: topCategoriesWithNames,
      topCities: topCities.map((c) => ({
        city: c.city,
        count: c._count.id,
      })),
    };
  }

  /**
   * Weekly chart data - requests/proposals per day this week
   */
  async getWeeklyChart(userId: string) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const days: { date: string; label: string; requests: number; proposals: number }[] = [];
    const persianDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startOfWeek);
      dayStart.setDate(startOfWeek.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const [requestCount, proposalCount] = await Promise.all([
        this.prisma.serviceRequest.count({
          where: {
            userId,
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
        this.prisma.proposal.count({
          where: {
            userId,
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
      ]);

      days.push({
        date: dayStart.toISOString().split('T')[0],
        label: persianDays[(i + 1) % 7], // Shift to Saturday first
        requests: requestCount,
        proposals: proposalCount,
      });
    }

    return days;
  }

  /**
   * Monthly earnings - last 6 months
   */
  async getMonthlyEarnings(userId: string) {
    const months: { month: string; earnings: number; expenses: number }[] = [];
    const persianMonths = [
      'فروردین', 'اردیبهشت', 'خرداد',
      'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر',
      'دی', 'بهمن', 'اسفند',
    ];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 1);

      const [earningsResult, expensesResult] = await Promise.all([
        // Earnings: payments received (incoming)
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'PAYMENT',
            status: 'COMPLETED',
            createdAt: { gte: firstDay, lt: lastDay },
          },
          _sum: { amount: true },
        }),
        // Expenses: payments sent (outgoing)
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: { in: ['PAYMENT', 'COMMISSION'] },
            status: 'COMPLETED',
            createdAt: { gte: firstDay, lt: lastDay },
          },
          _sum: { amount: true },
        }),
      ]);

      months.push({
        month: `${persianMonths[month]} ${year.toString().slice(2)}`,
        earnings: earningsResult._sum.amount || 0,
        expenses: expensesResult._sum.amount || 0,
      });
    }

    return months;
  }

  /**
   * Recent activity for user (last 10 actions)
   */
  async getRecentActivity(userId: string) {
    // Get recent requests
    const recentRequests = await this.prisma.serviceRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
    });

    // Get recent proposals
    const recentProposals = await this.prisma.proposal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        price: true,
        status: true,
        createdAt: true,
        request: {
          select: { title: true },
        },
      },
    });

    // Get recent reviews received
    const recentReviews = await this.prisma.review.findMany({
      where: { userId, isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        rating: true,
        createdAt: true,
        author: {
          select: { firstName: true, lastName: true, avatar: true },
        },
      },
    });

    const activities = [
      ...recentRequests.map((r) => ({
        type: 'REQUEST' as const,
        id: r.id,
        title: r.title,
        description: `درخواست شما با وضعیت "${r.status}"`,
        createdAt: r.createdAt,
      })),
      ...recentProposals.map((p) => ({
        type: 'PROPOSAL' as const,
        id: p.id,
        title: `پیشنهاد برای "${p.request?.title || ''}"`,
        description: `وضعیت: ${p.status} - مبلغ: ${p.price?.toLocaleString('fa-IR') || '۰'} تومان`,
        createdAt: p.createdAt,
      })),
      ...recentReviews.map((r) => ({
        type: 'REVIEW' as const,
        id: r.id,
        title: `${r.author.firstName} ${r.author.lastName}`,
        description: `امتیاز ${r.rating} از ۵`,
        createdAt: r.createdAt,
      })),
    ];

    // Sort by date and take top 10
    activities.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return activities.slice(0, 10);
  }

  /**
   * Calculate profile completion percentage
   */
  private calculateProfileCompletion(
    user: any,
    extras: {
      skillsCount: number;
      portfolioCount: number;
      totalReviews: number;
      hasWallet: boolean;
    },
  ): number {
    let completion = 0;
    const checks = [
      { done: !!user.avatar, weight: 10 },
      { done: !!user.bio && user.bio.length > 10, weight: 10 },
      { done: !!user.city, weight: 10 },
      { done: !!user.province, weight: 5 },
      { done: !!user.displayName, weight: 5 },
      { done: !!user.firstName, weight: 5 },
      { done: !!user.lastName, weight: 5 },
      { done: extras.skillsCount > 0, weight: 15 },
      { done: extras.portfolioCount > 0, weight: 15 },
      { done: extras.totalReviews > 0, weight: 10 },
      { done: user.isVerified, weight: 10 },
    ];

    for (const check of checks) {
      if (check.done) {
        completion += check.weight;
      }
    }

    return Math.min(100, completion);
  }
}
