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
var DashboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let DashboardService = DashboardService_1 = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DashboardService_1.name);
    }
    async getUserStats(userId) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
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
        const [totalRequests, activeRequests, completedProjects, totalProposals, acceptedProposals, averageRatingResult, totalReviews, walletData, unreadMessages, unreadNotifications, skillsCount, portfolioCount,] = await Promise.all([
            this.prisma.serviceRequest.count({ where: { userId } }),
            this.prisma.serviceRequest.count({
                where: { userId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
            }),
            this.prisma.serviceRequest.count({
                where: { userId, status: 'COMPLETED' },
            }),
            this.prisma.proposal.count({ where: { userId } }),
            this.prisma.proposal.count({
                where: { userId, status: 'ACCEPTED' },
            }),
            this.prisma.review.aggregate({
                where: { userId, isPublished: true },
                _avg: { rating: true },
            }),
            this.prisma.review.count({
                where: { userId, isPublished: true },
            }),
            this.prisma.wallet.findUnique({
                where: { userId },
                select: { balance: true, frozen: true },
            }),
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
            this.prisma.notification.count({
                where: { userId, isRead: false },
            }),
            this.prisma.userSkill.count({ where: { userId } }),
            this.prisma.portfolio.count({ where: { userId } }),
        ]);
        const earningsResult = await this.prisma.transaction.aggregate({
            where: {
                userId,
                type: 'PAYMENT',
                status: 'COMPLETED',
            },
            _sum: { amount: true },
        });
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
        const successRate = totalProposals > 0
            ? Math.round((acceptedProposals / totalProposals) * 100)
            : 0;
        const profileCompletion = this.calculateProfileCompletion(user, {
            skillsCount,
            portfolioCount,
            totalReviews,
            hasWallet: !!walletData,
        });
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
            totalRequests,
            activeRequests,
            completedProjects,
            thisMonthRequests,
            totalProposals,
            acceptedProposals,
            successRate,
            thisMonthProposals,
            totalEarnings,
            pendingPayments,
            walletBalance: walletData?.balance || 0,
            walletFrozen: walletData?.frozen || 0,
            walletAvailable: (walletData?.balance || 0) - (walletData?.frozen || 0),
            averageRating,
            totalReviews,
            profileCompletion,
            skillsCount,
            portfolioCount,
            unreadMessages,
            unreadNotifications,
        };
    }
    async getAdminStats() {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const [totalUsers, newUsersThisMonth, newUsersLastMonth, activeUsers, totalRequests, openRequests, completedRequests, newRequestsThisMonth, newRequestsLastMonth, totalProposals, pendingProposals, totalSpecialists, verifiedSpecialists, totalRevenue, pendingWithdrawalsAmount, totalReviews, avgRatingResult, totalCoupons, activeCoupons, pendingReports,] = await Promise.all([
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
        const topCities = await this.prisma.user.groupBy({
            by: ['city'],
            where: { city: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        });
        const userGrowth = newUsersLastMonth > 0
            ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
            : newUsersThisMonth > 0 ? 100 : 0;
        const requestGrowth = newRequestsLastMonth > 0
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
    async getWeeklyChart(userId) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
        startOfWeek.setHours(0, 0, 0, 0);
        const days = [];
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
                label: persianDays[(i + 1) % 7],
                requests: requestCount,
                proposals: proposalCount,
            });
        }
        return days;
    }
    async getMonthlyEarnings(userId) {
        const months = [];
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
                this.prisma.transaction.aggregate({
                    where: {
                        userId,
                        type: 'PAYMENT',
                        status: 'COMPLETED',
                        createdAt: { gte: firstDay, lt: lastDay },
                    },
                    _sum: { amount: true },
                }),
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
    async getRecentActivity(userId) {
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
                type: 'REQUEST',
                id: r.id,
                title: r.title,
                description: `درخواست شما با وضعیت "${r.status}"`,
                createdAt: r.createdAt,
            })),
            ...recentProposals.map((p) => ({
                type: 'PROPOSAL',
                id: p.id,
                title: `پیشنهاد برای "${p.request?.title || ''}"`,
                description: `وضعیت: ${p.status} - مبلغ: ${p.price?.toLocaleString('fa-IR') || '۰'} تومان`,
                createdAt: p.createdAt,
            })),
            ...recentReviews.map((r) => ({
                type: 'REVIEW',
                id: r.id,
                title: `${r.author.firstName} ${r.author.lastName}`,
                description: `امتیاز ${r.rating} از ۵`,
                createdAt: r.createdAt,
            })),
        ];
        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return activities.slice(0, 10);
    }
    calculateProfileCompletion(user, extras) {
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
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = DashboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map