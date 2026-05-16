import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateReferralCode } from '../../common/utils';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate unique referral code for a user
   */
  async generateReferralCode(userId: string) {
    // Check if user already has a referral code
    const existingReferral = await this.prisma.referral.findFirst({
      where: { referrerId: userId },
      select: { code: true },
    });

    if (existingReferral) {
      return { code: existingReferral.code };
    }

    // Generate unique code
    let code: string = '';
    let unique = false;
    let attempts = 0;

    while (!unique && attempts < 100) {
      code = generateReferralCode();
      const existing = await this.prisma.referral.findFirst({
        where: { code },
      });
      if (!existing) {
        unique = true;
      }
      attempts++;
    }

    if (!unique || !code) {
      throw new BadRequestException('خطا در تولید کد دعوت. لطفاً دوباره تلاش کنید');
    }

    // Create a referral record (self-reference) to store the code
    await this.prisma.referral.create({
      data: {
        referrerId: userId,
        referredId: userId, // self-reference to store code
        code,
        reward: 0,
        isClaimed: true, // Don't count self-references
      },
    });

    this.logger.log(`Referral code generated: ${code} for user ${userId}`);

    return { code };
  }

  /**
   * Get my referral info - code, stats (total referred, completed, earned)
   */
  async getMyReferralInfo(userId: string) {
    // Find or generate referral code
    let referralRecord = await this.prisma.referral.findFirst({
      where: { referrerId: userId },
      select: { code: true },
    });

    let code: string;

    if (!referralRecord) {
      // Auto-generate code
      const result = await this.generateReferralCode(userId);
      code = result.code;
    } else {
      code = referralRecord.code;
    }

    // Get all referrals (excluding self-references)
    const referrals = await this.prisma.referral.findMany({
      where: {
        referrerId: userId,
        referredId: { not: userId }, // Exclude self-reference
      },
      select: {
        id: true,
        referredId: true,
        reward: true,
        isClaimed: true,
        createdAt: true,
        referred: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isVerified: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReferred = referrals.length;
    const completedReferrals = referrals.filter((r) => r.reward > 0).length;
    const totalEarned = referrals.reduce((sum, r) => sum + r.reward, 0);
    const claimedRewards = referrals
      .filter((r) => r.isClaimed)
      .reduce((sum, r) => sum + r.reward, 0);
    const pendingRewards = totalEarned - claimedRewards;

    // Referral link
    const referralLink = `${process.env.FRONTEND_URL || 'https://needfinder.ir'}/ref/${code}`;

    return {
      code,
      referralLink,
      stats: {
        totalReferred,
        completedReferrals,
        totalEarned,
        claimedRewards,
        pendingRewards,
      },
    };
  }

  /**
   * Apply referral code on registration
   */
  async applyReferral(userId: string, code: string) {
    // Check if user already used a referral
    const existingReferral = await this.prisma.referral.findFirst({
      where: { referredId: userId, id: { not: userId } },
    });

    if (existingReferral) {
      throw new BadRequestException('شما قبلاً از یک کد دعوت استفاده کرده‌اید');
    }

    // Find the referral code
    const referrerRecord = await this.prisma.referral.findFirst({
      where: { code },
    });

    if (!referrerRecord) {
      throw new NotFoundException('کد دعوت نامعتبر است');
    }

    const referrerId = referrerRecord.referrerId;

    // Cannot refer yourself
    if (referrerId === userId) {
      throw new BadRequestException('شما نمی‌توانید از کد دعوت خود استفاده کنید');
    }

    // Check referrer is active
    const referrer = await this.prisma.user.findUnique({
      where: { id: referrerId },
      select: { id: true, isActive: true, isBanned: true },
    });

    if (!referrer || !referrer.isActive || referrer.isBanned) {
      throw new BadRequestException('کد دعوت مربوط به کاربر فعال نیست');
    }

    // Create referral record
    const reward = 10000; // Default referral reward: 10,000 Toman

    const referral = await this.prisma.referral.create({
      data: {
        referrerId,
        referredId: userId,
        code,
        reward,
        isClaimed: false,
      },
    });

    // Notify the referrer
    const referredUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    await this.prisma.notification.create({
      data: {
        userId: referrerId,
        type: 'NEW_REFERRAL',
        title: 'دعوت جدید',
        message: `${referredUser?.firstName || ''} ${referredUser?.lastName || ''} با کد دعوت شما ثبت‌نام کرد. پاداش ${reward.toLocaleString('fa-IR')} تومان ثبت شد`,
        data: JSON.stringify({
          referralId: referral.id,
          reward,
          referredUserId: userId,
        }),
      },
    });

    this.logger.log(`Referral applied: ${code} by user ${userId}`);

    return {
      message: 'کد دعوت با موفقیت اعمال شد',
      data: {
        code,
        reward,
      },
    };
  }

  /**
   * Referral analytics for user
   */
  async getReferralStats(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: {
        referrerId: userId,
        referredId: { not: userId },
      },
      select: {
        id: true,
        referredId: true,
        reward: true,
        isClaimed: true,
        createdAt: true,
        referred: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isVerified: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Monthly breakdown
    const now = new Date();
    const monthlyBreakdown: { month: string; count: number; reward: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthReferrals = referrals.filter((r) => {
        const created = new Date(r.createdAt);
        return created >= date && created < nextMonth;
      });

      const persianMonths = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
      ];

      monthlyBreakdown.push({
        month: `${persianMonths[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`,
        count: monthReferrals.length,
        reward: monthReferrals.reduce((sum, r) => sum + r.reward, 0),
      });
    }

    // Conversion rate: how many referred users completed first project
    const referredIds = referrals.map((r) => r.referredId);
    let completedProjectsCount = 0;
    if (referredIds.length > 0) {
      completedProjectsCount = await this.prisma.serviceRequest.count({
        where: {
          userId: { in: referredIds },
          status: 'COMPLETED',
        },
      });
    }

    return {
      totalReferred: referrals.length,
      totalEarned: referrals.reduce((sum, r) => sum + r.reward, 0),
      claimedRewards: referrals.filter((r) => r.isClaimed).reduce((sum, r) => sum + r.reward, 0),
      pendingRewards: referrals.filter((r) => !r.isClaimed).reduce((sum, r) => sum + r.reward, 0),
      completedReferrals: referrals.filter((r) => r.reward > 0).length,
      conversionRate: referredIds.length > 0
        ? Math.round((completedProjectsCount / referredIds.length) * 100)
        : 0,
      monthlyBreakdown,
      referrals: referrals.slice(0, 20), // Last 20
    };
  }

  /**
   * Process referral reward when referred user completes first project
   */
  async processReward(referralId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        referrer: { select: { id: true, isActive: true, isBanned: true } },
        referred: { select: { id: true } },
      },
    });

    if (!referral) {
      throw new NotFoundException('رکورد دعوت مورد نظر یافت نشد');
    }

    if (referral.reward > 0) {
      throw new BadRequestException('پاداش این دعوت قبلاً تعیین شده است');
    }

    if (referral.referredId === referral.referrerId) {
      throw new BadRequestException('رکورد دعوت نامعتبر است');
    }

    if (!referral.referrer.isActive || referral.referrer.isBanned) {
      throw new BadRequestException('کاربر دعوت‌کننده فعال نیست');
    }

    const reward = 10000;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedReferral = await tx.referral.update({
        where: { id: referralId },
        data: { reward },
      });

      // Create notification for referrer
      await tx.notification.create({
        data: {
          userId: referral.referrerId,
          type: 'REFERRAL_REWARD',
          title: 'پاداش دعوت آماده دریافت',
          message: `پاداش ${reward.toLocaleString('fa-IR')} تومان بابت تکمیل اولین پروژه کاربر دعوت شده آماده دریافت است`,
          data: JSON.stringify({
            referralId,
            reward,
          }),
        },
      });

      return { referral: updatedReferral };
    });

    this.logger.log(`Referral reward processed: ${referralId}, reward: ${reward}`);

    return {
      message: 'پاداش دعوت با موفقیت پردازش شد',
      data: result,
    };
  }

  /**
   * Get top referrers leaderboard
   */
  async getLeaderboard() {
    const referrers = await this.prisma.referral.groupBy({
      by: ['referrerId'],
      where: {
        referredId: { not: undefined }, // Exclude self-references
        reward: { gt: 0 },
      },
      _count: { id: true },
      _sum: { reward: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const referrerIds = referrers.map((r) => r.referrerId);

    const users = referrerIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: referrerIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
            isVerified: true,
            role: true,
          },
        })
      : [];

    return referrers.map((r, index) => {
      const user = users.find((u) => u.id === r.referrerId);
      return {
        rank: index + 1,
        user: user
          ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              displayName: user.displayName,
              avatar: user.avatar,
              isVerified: user.isVerified,
            }
          : null,
        totalReferrals: r._count.id,
        totalRewards: r._sum.reward || 0,
      };
    });
  }
}
