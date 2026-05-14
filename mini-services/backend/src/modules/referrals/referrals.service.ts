import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateReferralCode } from '../../common/utils';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyReferralInfo(userId: string) {
    // Find or create referral code for user
    let referral = await this.prisma.referral.findFirst({
      where: { referrerId: userId },
    });

    let code = referral?.code;

    if (!code) {
      // Generate a unique referral code
      let unique = false;
      while (!unique) {
        code = generateReferralCode();
        const existing = await this.prisma.referral.findFirst({
          where: { code },
        });
        if (!existing) {
          unique = true;
        }
      }
    }

    // Get referral stats
    const totalInvites = await this.prisma.referral.count({
      where: { referrerId: userId },
    });

    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      select: { isClaimed: true, reward: true },
    });

    const successfulInvites = referrals.filter((r) => r.reward > 0).length;
    const totalRewards = referrals.reduce((sum, r) => sum + r.reward, 0);
    const claimedRewards = referrals
      .filter((r) => r.isClaimed)
      .reduce((sum, r) => sum + r.reward, 0);
    const pendingRewards = totalRewards - claimedRewards;

    return {
      code,
      stats: {
        totalInvites,
        successfulInvites,
        totalRewards,
        pendingRewards,
        claimedRewards,
      },
    };
  }

  async getMyReferrals(
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = { referrerId: userId };

    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          referred: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              createdAt: true,
              role: true,
              isVerified: true,
            },
          },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return {
      data: referrals.map((r) => ({
        id: r.id,
        code: r.code,
        reward: r.reward,
        isClaimed: r.isClaimed,
        referredUser: r.referred,
        createdAt: r.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async claimReward(userId: string, referralId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!referral) {
      throw new NotFoundException('رکورد دعوت مورد نظر یافت نشد');
    }

    if (referral.referrerId !== userId) {
      throw new BadRequestException('این دعوت متعلق به شما نیست');
    }

    if (referral.isClaimed) {
      throw new BadRequestException('پاداش این دعوت قبلاً دریافت شده است');
    }

    if (referral.reward <= 0) {
      throw new BadRequestException('پاداشی برای این دعوت تعیین نشده است');
    }

    // Get or create wallet
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balance: 0, frozen: 0 },
      });
    }

    // Use transaction to claim reward
    const result = await this.prisma.$transaction(async (tx) => {
      const [updatedReferral, updatedWallet, transaction] = await Promise.all([
        tx.referral.update({
          where: { id: referralId },
          data: { isClaimed: true },
        }),
        tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: referral.reward } },
        }),
        tx.transaction.create({
          data: {
            walletId: wallet.id,
            userId,
            type: 'BONUS',
            amount: referral.reward,
            description: `پاداش دعوت از دوستان - کد ${referral.code}`,
            referenceId: referralId,
            status: 'COMPLETED',
          },
        }),
      ]);

      return { referral: updatedReferral, wallet: updatedWallet, transaction };
    });

    // Create notification
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'REFERRAL_REWARD',
        title: 'پاداش دعوت',
        message: `پاداش ${referral.reward.toLocaleString('fa-IR')} تومان بابت دعوت از دوستان به کیف پول شما اضافه شد`,
        data: JSON.stringify({
          referralId,
          reward: referral.reward,
        }),
      },
    });

    return {
      message: 'پاداش با موفقیت به کیف پول شما اضافه شد',
      data: {
        reward: referral.reward,
        walletBalance: result.wallet.balance,
      },
    };
  }

  async applyReferralCode(userId: string, code: string) {
    // Check if user already used a referral
    const existingReferral = await this.prisma.referral.findUnique({
      where: { referredId: userId },
    });

    if (existingReferral) {
      throw new BadRequestException('شما قبلاً از یک کد دعوت استفاده کرده‌اید');
    }

    // Find the referral by code - find a referral record with this code to identify referrer
    // The referrer's code is stored in their referral records
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
    await this.prisma.notification.create({
      data: {
        userId: referrerId,
        type: 'NEW_REFERRAL',
        title: 'دعوت جدید',
        message: `یک نفر با کد دعوت شما ثبت‌نام کرد. پاداش ${reward.toLocaleString('fa-IR')} تومان برای شما ثبت شد`,
        data: JSON.stringify({
          referralId: referral.id,
          reward,
        }),
      },
    });

    return {
      message: 'کد دعوت با موفقیت اعمال شد',
      data: {
        code,
        reward,
      },
    };
  }

  async getTopReferrers() {
    const referrers = await this.prisma.referral.groupBy({
      by: ['referrerId'],
      _count: { id: true },
      _sum: { reward: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const referrerIds = referrers.map((r) => r.referrerId);

    const users = await this.prisma.user.findMany({
      where: { id: { in: referrerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isVerified: true,
        role: true,
      },
    });

    return referrers.map((r, index) => {
      const user = users.find((u) => u.id === r.referrerId);
      return {
        rank: index + 1,
        user,
        totalReferrals: r._count.id,
        totalRewards: r._sum.reward || 0,
      };
    });
  }
}
