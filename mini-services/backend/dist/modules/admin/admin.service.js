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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AdminService = AdminService_1 = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AdminService_1.name);
    }
    async getDashboardStats() {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const [totalUsers, activeUsers, newUsersThisMonth, totalSpecialists, verifiedSpecialists, totalRequests, openRequests, inProgressRequests, completedRequests, totalProposals, pendingProposals, revenueResult, pendingWithdrawalsResult, totalReviews, avgRatingResult, topCategories, thisMonthRequests, lastMonthRequests, thisMonthUsers, lastMonthUsers, totalCoupons, activeCoupons, pendingReports,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { isActive: true, isBanned: false } }),
            this.prisma.user.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
            this.prisma.user.count({ where: { role: 'SPECIALIST' } }),
            this.prisma.user.count({ where: { role: 'SPECIALIST', isVerified: true } }),
            this.prisma.serviceRequest.count(),
            this.prisma.serviceRequest.count({ where: { status: 'OPEN' } }),
            this.prisma.serviceRequest.count({ where: { status: 'IN_PROGRESS' } }),
            this.prisma.serviceRequest.count({ where: { status: 'COMPLETED' } }),
            this.prisma.proposal.count(),
            this.prisma.proposal.count({ where: { status: 'PENDING' } }),
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
            this.prisma.serviceRequest.groupBy({
                by: ['categoryId'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5,
            }),
            this.prisma.serviceRequest.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
            this.prisma.serviceRequest.count({
                where: { createdAt: { gte: firstDayOfLastMonth, lt: firstDayOfMonth } },
            }),
            this.prisma.user.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
            this.prisma.user.count({
                where: { createdAt: { gte: firstDayOfLastMonth, lt: firstDayOfMonth } },
            }),
            this.prisma.coupon.count(),
            this.prisma.coupon.count({
                where: {
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
            }),
            this.prisma.report.count({ where: { status: 'PENDING' } }),
        ]);
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
        const requestGrowth = lastMonthRequests > 0
            ? ((thisMonthRequests - lastMonthRequests) / lastMonthRequests) * 100
            : thisMonthRequests > 0
                ? 100
                : 0;
        const userGrowth = lastMonthUsers > 0
            ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100
            : thisMonthUsers > 0
                ? 100
                : 0;
        return {
            users: {
                total: totalUsers,
                active: activeUsers,
                newThisMonth: newUsersThisMonth,
                growthPercent: Number(userGrowth.toFixed(1)),
            },
            specialists: {
                total: totalSpecialists,
                verified: verifiedSpecialists,
            },
            requests: {
                total: totalRequests,
                open: openRequests,
                inProgress: inProgressRequests,
                completed: completedRequests,
                newThisMonth: thisMonthRequests,
                growthPercent: Number(requestGrowth.toFixed(1)),
            },
            proposals: {
                total: totalProposals,
                pending: pendingProposals,
            },
            revenue: {
                total: revenueResult._sum.amount || 0,
                pendingWithdrawals: pendingWithdrawalsResult._sum.amount || 0,
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
            topCities: topCities.map((c) => ({ city: c.city, count: c._count.id })),
            growthMetrics: {
                vsLastMonth: {
                    users: {
                        thisMonth: thisMonthUsers,
                        lastMonth: lastMonthUsers,
                        growthPercent: Number(userGrowth.toFixed(1)),
                    },
                    requests: {
                        thisMonth: thisMonthRequests,
                        lastMonth: lastMonthRequests,
                        growthPercent: Number(requestGrowth.toFixed(1)),
                    },
                },
            },
        };
    }
    async getUsers(query) {
        const { role, status, isVerified, search, sortBy, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (role) {
            where.role = role;
        }
        if (status === 'active') {
            where.isActive = true;
            where.isBanned = false;
        }
        else if (status === 'inactive') {
            where.isActive = false;
        }
        else if (status === 'banned') {
            where.isBanned = true;
        }
        if (isVerified === 'true') {
            where.isVerified = true;
        }
        else if (isVerified === 'false') {
            where.isVerified = false;
        }
        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { displayName: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
            ];
        }
        let orderBy = { createdAt: 'desc' };
        if (sortBy === 'oldest') {
            orderBy = { createdAt: 'asc' };
        }
        else if (sortBy === 'name') {
            orderBy = { firstName: 'asc' };
        }
        else if (sortBy === 'rating') {
            orderBy = { averageRating: 'desc' };
        }
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    displayName: true,
                    avatar: true,
                    city: true,
                    province: true,
                    role: true,
                    isVerified: true,
                    isActive: true,
                    isBanned: true,
                    banReason: true,
                    emailVerified: true,
                    phoneVerified: true,
                    averageRating: true,
                    reviewCount: true,
                    createdAt: true,
                    wallet: {
                        select: {
                            balance: true,
                            frozen: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async toggleUserStatus(adminId, userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('کاربر مورد نظر یافت نشد');
        }
        if (user.role === 'SUPER_ADMIN') {
            throw new common_1.BadRequestException('شما نمی‌توانید وضعیت سوپر ادمین را تغییر دهید');
        }
        let updateData = {};
        switch (dto.action) {
            case 'activate':
                updateData = { isActive: true, isBanned: false, banReason: null };
                break;
            case 'deactivate':
                updateData = { isActive: false };
                break;
            case 'ban':
                updateData = { isBanned: true, banReason: dto.reason || 'بدون دلیل', isActive: false };
                break;
        }
        const [updatedUser] = await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: updateData,
            }),
            this.prisma.adminLog.create({
                data: {
                    adminId,
                    action: `USER_${dto.action.toUpperCase()}`,
                    target: `User:${userId}`,
                    details: JSON.stringify({
                        userId,
                        action: dto.action,
                        reason: dto.reason,
                        previousState: {
                            isActive: user.isActive,
                            isBanned: user.isBanned,
                        },
                    }),
                },
            }),
        ]);
        if (dto.action === 'ban') {
            await this.prisma.notification.create({
                data: {
                    userId,
                    type: 'BAN',
                    title: 'حساب کاربری مسدود شد',
                    message: `حساب کاربری شما مسدود شده است. دلیل: ${dto.reason || 'بدون دلیل'}`,
                    data: JSON.stringify({ reason: dto.reason }),
                },
            });
        }
        return {
            message: dto.action === 'activate'
                ? 'کاربر فعال شد'
                : dto.action === 'deactivate'
                    ? 'کاربر غیرفعال شد'
                    : 'کاربر مسدود شد',
        };
    }
    async manageRequest(adminId, requestId, dto) {
        const request = await this.prisma.serviceRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new common_1.NotFoundException('درخواست مورد نظر یافت نشد');
        }
        const updateData = {};
        if (dto.status) {
            updateData.status = dto.status;
            if (['CLOSED', 'COMPLETED', 'CANCELLED'].includes(dto.status)) {
                updateData.closedAt = dto.closedAt ? new Date(dto.closedAt) : new Date();
            }
        }
        if (dto.isFeatured !== undefined) {
            updateData.isFeatured = dto.isFeatured;
        }
        const [updatedRequest] = await this.prisma.$transaction([
            this.prisma.serviceRequest.update({
                where: { id: requestId },
                data: updateData,
            }),
            this.prisma.adminLog.create({
                data: {
                    adminId,
                    action: 'MANAGE_REQUEST',
                    target: `Request:${requestId}`,
                    details: JSON.stringify({
                        requestId,
                        changes: dto,
                        previousStatus: request.status,
                    }),
                },
            }),
        ]);
        return {
            message: 'درخواست با موفقیت بروزرسانی شد',
            data: updatedRequest,
        };
    }
    async getAuditLogs(query) {
        const { adminId, action, entity, userId, dateFrom, dateTo, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (adminId) {
            where.adminId = adminId;
        }
        if (action) {
            where.action = { contains: action };
        }
        if (entity) {
            where.target = { contains: entity };
        }
        if (userId) {
            where.details = { contains: userId };
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                where.createdAt.gte = new Date(dateFrom);
            }
            if (dateTo) {
                where.createdAt.lte = new Date(dateTo);
            }
        }
        const [logs, total] = await Promise.all([
            this.prisma.adminLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.adminLog.count({ where }),
        ]);
        const adminIds = [...new Set(logs.map((l) => l.adminId))];
        const admins = adminIds.length > 0
            ? await this.prisma.user.findMany({
                where: { id: { in: adminIds } },
                select: { id: true, firstName: true, lastName: true, email: true },
            })
            : [];
        const logsWithAdmin = logs.map((log) => {
            const admin = admins.find((a) => a.id === log.adminId);
            return {
                ...log,
                admin: admin
                    ? {
                        id: admin.id,
                        name: `${admin.firstName} ${admin.lastName}`,
                        email: admin.email,
                    }
                    : null,
            };
        });
        return {
            data: logsWithAdmin,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getSystemHealth() {
        const startTime = Date.now();
        let dbHealthy = false;
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            dbHealthy = true;
        }
        catch {
            dbHealthy = false;
        }
        const dbLatency = Date.now() - startTime;
        const [totalUsers, activeSessions, pendingJobs, pendingReports, pendingWithdrawals, todayRequests, todayProposals,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.authToken.count({
                where: { expiresAt: { gt: new Date() } },
            }),
            this.prisma.report.count({ where: { status: 'PENDING' } }),
            this.prisma.report.count({ where: { status: 'PENDING' } }),
            this.prisma.transaction.count({
                where: { type: 'WITHDRAW', status: 'PENDING' },
            }),
            this.prisma.serviceRequest.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            this.prisma.proposal.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
        ]);
        return {
            status: dbHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            database: {
                status: dbHealthy ? 'connected' : 'disconnected',
                latency: `${dbLatency}ms`,
            },
            metrics: {
                totalUsers,
                activeSessions,
                pendingReports,
                pendingWithdrawals,
                todayRequests,
                todayProposals,
            },
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
        };
    }
    async createCoupon(adminId, dto) {
        const existing = await this.prisma.coupon.findUnique({
            where: { code: dto.code.toUpperCase() },
        });
        if (existing) {
            throw new common_1.BadRequestException('این کد تخفیف قبلاً ثبت شده است');
        }
        const [coupon] = await this.prisma.$transaction([
            this.prisma.coupon.create({
                data: {
                    code: dto.code.toUpperCase(),
                    type: dto.type,
                    value: dto.value,
                    minOrder: dto.minOrder || 0,
                    maxUses: dto.maxUses || 0,
                    startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
                    expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                },
            }),
            this.prisma.adminLog.create({
                data: {
                    adminId,
                    action: 'CREATE_COUPON',
                    target: `Coupon:${dto.code.toUpperCase()}`,
                    details: JSON.stringify(dto),
                },
            }),
        ]);
        return {
            message: 'کد تخفیف با موفقیت ایجاد شد',
            data: coupon,
        };
    }
    async getCoupons() {
        return this.prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async deleteCoupon(adminId, couponId) {
        const coupon = await this.prisma.coupon.findUnique({
            where: { id: couponId },
        });
        if (!coupon) {
            throw new common_1.NotFoundException('کد تخفیف مورد نظر یافت نشد');
        }
        await this.prisma.$transaction([
            this.prisma.coupon.delete({
                where: { id: couponId },
            }),
            this.prisma.adminLog.create({
                data: {
                    adminId,
                    action: 'DELETE_COUPON',
                    target: `Coupon:${coupon.code}`,
                    details: JSON.stringify({ couponId, code: coupon.code }),
                },
            }),
        ]);
        return {
            message: 'کد تخفیف با موفقیت حذف شد',
        };
    }
    async getReports(query) {
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const [reports, total] = await Promise.all([
            this.prisma.report.findMany({
                where,
                include: {
                    reporter: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            displayName: true,
                            avatar: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.report.count({ where }),
        ]);
        return {
            data: reports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getRecentActivity() {
        const recentUsers = await this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                role: true,
                createdAt: true,
            },
        });
        const recentRequests = await this.prisma.serviceRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                status: true,
                userId: true,
                createdAt: true,
                user: {
                    select: { firstName: true, lastName: true },
                },
            },
        });
        const recentProposals = await this.prisma.proposal.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                price: true,
                status: true,
                userId: true,
                requestId: true,
                createdAt: true,
                user: {
                    select: { firstName: true, lastName: true },
                },
            },
        });
        const recentReviews = await this.prisma.review.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
                author: {
                    select: { firstName: true, lastName: true },
                },
                user: {
                    select: { firstName: true, lastName: true },
                },
            },
        });
        const activities = [
            ...recentUsers.map((u) => ({
                type: 'NEW_USER',
                id: u.id,
                title: `${u.firstName} ${u.lastName}`,
                description: 'کاربر جدید ثبت‌نام کرد',
                role: u.role,
                createdAt: u.createdAt,
            })),
            ...recentRequests.map((r) => ({
                type: 'NEW_REQUEST',
                id: r.id,
                title: r.title,
                description: `درخواست جدید توسط ${r.user.firstName} ${r.user.lastName}`,
                status: r.status,
                createdAt: r.createdAt,
            })),
            ...recentProposals.map((p) => ({
                type: 'NEW_PROPOSAL',
                id: p.id,
                title: `پیشنهاد ${p.price.toLocaleString('fa-IR')} تومان`,
                description: `پیشنهاد جدید توسط ${p.user.firstName} ${p.user.lastName}`,
                status: p.status,
                createdAt: p.createdAt,
            })),
            ...recentReviews.map((r) => ({
                type: 'NEW_REVIEW',
                id: r.id,
                title: `${r.rating} ستاره`,
                description: `نظر جدید از ${r.author.firstName} ${r.author.lastName}`,
                createdAt: r.createdAt,
            })),
        ];
        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return activities.slice(0, 20);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map