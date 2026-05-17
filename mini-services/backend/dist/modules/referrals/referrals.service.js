"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReferralsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const utils_1 = require("../../common/utils");
let ReferralsService = ReferralsService_1 = class ReferralsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ReferralsService_1.name);
    }
    async generateReferralCode(userId) {
        const existingReferral = await this.prisma.referral.findFirst({
            where: { referrerId: userId },
            select: { code: true },
        });
        if (existingReferral) {
            return { code: existingReferral.code };
        }
        let code = '';
        let unique = false;
        let attempts = 0;
        while (!unique && attempts < 100) {
            code = (0, utils_1.generateReferralCode)();
            const existing = await this.prisma.referral.findFirst({
                where: { code },
            });
            if (!existing) {
                unique = true;
            }
            attempts++;
        }
        if (!unique || !code) {
            throw new common_1.BadRequestException('خطا در تولید کد دعوت. لطفاً دوباره تلاش کنید');
        }
        await this.prisma.referral.create({
            data: {
                referrerId: userId,
                referredId: userId,
                code,
                reward: 0,
                isClaimed: true,
            },
        });
        this.logger.log(`Referral code generated: ${code} for user ${userId}`);
        return { code };
    }
    async getMyReferralInfo(userId) {
        let referralRecord = await this.prisma.referral.findFirst({
            where: { referrerId: userId },
            select: { code: true },
        });
        let code;
        if (!referralRecord) {
            const result = await this.generateReferralCode(userId);
            code = result.code;
        }
        else {
            code = referralRecord.code;
        }
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
    async applyReferral(userId, code) {
        const existingReferral = await this.prisma.referral.findFirst({
            where: { referredId: userId, id: { not: userId } },
        });
        if (existingReferral) {
            throw new common_1.BadRequestException('شما قبلاً از یک کد دعوت استفاده کرده‌اید');
        }
        const referrerRecord = await this.prisma.referral.findFirst({
            where: { code },
        });
        if (!referrerRecord) {
            throw new common_1.NotFoundException('کد دعوت نامعتبر است');
        }
        const referrerId = referrerRecord.referrerId;
        if (referrerId === userId) {
            throw new common_1.BadRequestException('شما نمی‌توانید از کد دعوت خود استفاده کنید');
        }
        const referrer = await this.prisma.user.findUnique({
            where: { id: referrerId },
            select: { id: true, isActive: true, isBanned: true },
        });
        if (!referrer || !referrer.isActive || referrer.isBanned) {
            throw new common_1.BadRequestException('کد دعوت مربوط به کاربر فعال نیست');
        }
        const reward = 10000;
        const referral = await this.prisma.referral.create({
            data: {
                referrerId,
                referredId: userId,
                code,
                reward,
                isClaimed: false,
            },
        });
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
    async getReferralStats(userId) {
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
        const now = new Date();
        const monthlyBreakdown = [];
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
            referrals: referrals.slice(0, 20),
        };
    }
    async processReward(referralId) {
        const referral = await this.prisma.referral.findUnique({
            where: { id: referralId },
            include: {
                referrer: { select: { id: true, isActive: true, isBanned: true } },
                referred: { select: { id: true } },
            },
        });
        if (!referral) {
            throw new common_1.NotFoundException('رکورد دعوت مورد نظر یافت نشد');
        }
        if (referral.reward > 0) {
            throw new common_1.BadRequestException('پاداش این دعوت قبلاً تعیین شده است');
        }
        if (referral.referredId === referral.referrerId) {
            throw new common_1.BadRequestException('رکورد دعوت نامعتبر است');
        }
        if (!referral.referrer.isActive || referral.referrer.isBanned) {
            throw new common_1.BadRequestException('کاربر دعوت‌کننده فعال نیست');
        }
        const reward = 10000;
        const result = await this.prisma.$transaction(async (tx) => {
            const updatedReferral = await tx.referral.update({
                where: { id: referralId },
                data: { reward },
            });
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
    async getLeaderboard() {
        const referrers = await this.prisma.referral.groupBy({
            by: ['referrerId'],
            where: {
                referredId: { not: undefined },
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
};
exports.ReferralsService = ReferralsService;
exports.ReferralsService = ReferralsService = ReferralsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReferralsService);
//# sourceMappingURL=referrals.service.js.map