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
var ReviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ReviewsService = ReviewsService_1 = class ReviewsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ReviewsService_1.name);
    }
    async create(userId, dto) {
        const targetUser = await this.prisma.user.findUnique({
            where: { id: dto.targetUserId },
            select: { id: true, isActive: true, isBanned: true },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException('کاربر مورد نظر برای بررسی یافت نشد');
        }
        if (!targetUser.isActive) {
            throw new common_1.BadRequestException('کاربر مورد نظر غیرفعال است');
        }
        const request = await this.prisma.serviceRequest.findUnique({
            where: { id: dto.requestId },
            select: { id: true, title: true, status: true, userId: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('درخواست مورد نظر یافت نشد');
        }
        const proposal = await this.prisma.proposal.findUnique({
            where: { id: dto.proposalId },
            select: {
                id: true,
                status: true,
                userId: true,
                requestId: true,
            },
        });
        if (!proposal) {
            throw new common_1.NotFoundException('پیشنهاد مورد نظر یافت نشد');
        }
        if (proposal.requestId !== dto.requestId) {
            throw new common_1.BadRequestException('پیشنهاد مربوط به این درخواست نیست');
        }
        if (proposal.status !== 'ACCEPTED') {
            throw new common_1.BadRequestException('فقط می‌توانید برای پروژه‌های تکمیل شده نظر ثبت کنید');
        }
        const isRequestOwner = request.userId === userId;
        const isProposalOwner = proposal.userId === userId;
        if (!isRequestOwner && !isProposalOwner) {
            throw new common_1.ForbiddenException('شما اجازه ثبت نظر برای این پروژه را ندارید');
        }
        if (userId === dto.targetUserId) {
            throw new common_1.BadRequestException('شما نمی‌توانید به خودتان نظر دهید');
        }
        const otherParticipant = isRequestOwner ? proposal.userId : request.userId;
        if (dto.targetUserId !== otherParticipant) {
            throw new common_1.BadRequestException('شما فقط می‌توانید به طرف مقابل پروژه نظر دهید');
        }
        const existingReview = await this.prisma.review.findFirst({
            where: {
                authorId: userId,
                requestId: dto.requestId,
            },
        });
        if (existingReview) {
            throw new common_1.BadRequestException('شما قبلاً برای این درخواست نظر ثبت کرده‌اید');
        }
        const categoryRatings = [
            dto.qualityRating,
            dto.timingRating,
            dto.communicationRating,
            dto.professionalismRating,
        ].filter((r) => r !== undefined && r !== null);
        const overallRating = categoryRatings.length > 0
            ? Math.round((categoryRatings.reduce((sum, r) => sum + r, 0) / categoryRatings.length) * 2) / 2
            : dto.rating;
        const result = await this.prisma.$transaction(async (tx) => {
            const review = await tx.review.create({
                data: {
                    rating: overallRating,
                    qualityRating: dto.qualityRating,
                    timingRating: dto.timingRating,
                    communicationRating: dto.communicationRating,
                    professionalismRating: dto.professionalismRating,
                    comment: dto.comment || null,
                    pros: dto.pros,
                    cons: dto.cons,
                    isRecommended: dto.isRecommended ?? false,
                    isPublished: true,
                    authorId: userId,
                    userId: dto.targetUserId,
                    requestId: dto.requestId,
                    proposalId: dto.proposalId,
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            displayName: true,
                            avatar: true,
                        },
                    },
                },
            });
            const ratingStats = await tx.review.aggregate({
                where: { userId: dto.targetUserId, isPublished: true },
                _avg: { rating: true },
                _count: true,
            });
            await tx.user.update({
                where: { id: dto.targetUserId },
                data: {
                    averageRating: ratingStats._avg.rating
                        ? Math.round(ratingStats._avg.rating * 10) / 10
                        : 0,
                    reviewCount: ratingStats._count,
                },
            });
            return review;
        });
        await this.prisma.notification.create({
            data: {
                userId: dto.targetUserId,
                type: 'NEW_REVIEW',
                title: 'نظر جدید',
                message: `${result.author.firstName || ''} ${result.author.lastName || ''} نظر جدیدی برای شما ثبت کرد`,
                data: JSON.stringify({
                    reviewId: result.id,
                    rating: overallRating,
                    requestId: dto.requestId,
                    authorId: userId,
                }),
            },
        });
        this.logger.log(`Review created: ${result.id} by user ${userId} for user ${dto.targetUserId}`);
        return {
            message: 'نظر شما با موفقیت ثبت شد',
            review: result,
        };
    }
    async findByUser(userId, query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
        const skip = (page - 1) * limit;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('کاربر مورد نظر یافت نشد');
        }
        const [reviews, total] = await Promise.all([
            this.prisma.review.findMany({
                where: { userId, isPublished: true },
                include: {
                    author: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            displayName: true,
                            avatar: true,
                        },
                    },
                    request: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.review.count({
                where: { userId, isPublished: true },
            }),
        ]);
        const ratingDistribution = await this.prisma.review.groupBy({
            by: ['rating'],
            where: { userId, isPublished: true },
            _count: { rating: true },
        });
        const distributionMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingDistribution.forEach((r) => {
            distributionMap[r.rating] = r._count.rating;
        });
        const averageRating = await this.getAverageRating(userId);
        return {
            user,
            averageRating,
            totalReviews: total,
            ratingDistribution: distributionMap,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            reviews,
        };
    }
    async findByRequest(requestId) {
        const request = await this.prisma.serviceRequest.findUnique({
            where: { id: requestId },
            select: { id: true, title: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('درخواست مورد نظر یافت نشد');
        }
        const reviews = await this.prisma.review.findMany({
            where: { requestId, isPublished: true },
            include: {
                author: {
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
        });
        const avgResult = await this.prisma.review.aggregate({
            where: { requestId, isPublished: true },
            _avg: { rating: true },
        });
        return {
            request,
            totalReviews: reviews.length,
            averageRating: avgResult._avg.rating
                ? Math.round(avgResult._avg.rating * 10) / 10
                : 0,
            reviews,
        };
    }
    async respond(reviewId, userId, dto) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
            select: {
                id: true,
                userId: true,
                authorId: true,
                response: true,
            },
        });
        if (!review) {
            throw new common_1.NotFoundException('نظر مورد نظر یافت نشد');
        }
        if (review.userId !== userId) {
            throw new common_1.ForbiddenException('فقط کاربر مورد بررسی می‌تواند به نظر پاسخ دهد');
        }
        if (review.response) {
            throw new common_1.BadRequestException('شما قبلاً به این نظر پاسخ داده‌اید');
        }
        const updated = await this.prisma.review.update({
            where: { id: reviewId },
            data: { response: dto.response, respondedAt: new Date() },
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        displayName: true,
                        avatar: true,
                    },
                },
            },
        });
        await this.prisma.notification.create({
            data: {
                userId: review.authorId,
                type: 'REVIEW_RESPONSE',
                title: 'پاسخ به نظر شما',
                message: 'به نظر شما پاسخ داده شد',
                data: JSON.stringify({
                    reviewId,
                    targetUserId: userId,
                }),
            },
        });
        return {
            message: 'پاسخ شما با موفقیت ثبت شد',
            review: updated,
        };
    }
    async delete(reviewId, userId, userRole) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
            include: {
                author: {
                    select: { id: true, role: true },
                },
            },
        });
        if (!review) {
            throw new common_1.NotFoundException('نظر مورد نظر یافت نشد');
        }
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
        if (review.authorId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('فقط نویسنده نظر یا مدیر می‌تواند این نظر را حذف کند');
        }
        const targetUserId = review.userId;
        await this.prisma.review.delete({
            where: { id: reviewId },
        });
        const ratingStats = await this.prisma.review.aggregate({
            where: { userId: targetUserId, isPublished: true },
            _avg: { rating: true },
            _count: true,
        });
        await this.prisma.user.update({
            where: { id: targetUserId },
            data: {
                averageRating: ratingStats._avg.rating
                    ? Math.round(ratingStats._avg.rating * 10) / 10
                    : 0,
                reviewCount: ratingStats._count,
            },
        });
        this.logger.log(`Review deleted: ${reviewId} by user ${userId}`);
        return {
            message: 'نظر با موفقیت حذف شد',
        };
    }
    async getAverageRating(userId) {
        const result = await this.prisma.review.aggregate({
            where: { userId, isPublished: true },
            _avg: {
                rating: true,
                qualityRating: true,
                timingRating: true,
                communicationRating: true,
                professionalismRating: true,
            },
            _count: true,
        });
        return {
            overall: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : 0,
            quality: result._avg.qualityRating ? Math.round(result._avg.qualityRating * 10) / 10 : null,
            timing: result._avg.timingRating ? Math.round(result._avg.timingRating * 10) / 10 : null,
            communication: result._avg.communicationRating ? Math.round(result._avg.communicationRating * 10) / 10 : null,
            professionalism: result._avg.professionalismRating ? Math.round(result._avg.professionalismRating * 10) / 10 : null,
            totalReviews: result._count,
        };
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = ReviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map