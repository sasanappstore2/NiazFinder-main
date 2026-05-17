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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmarksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("@/prisma/prisma.service");
let BookmarksService = class BookmarksService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async toggleBookmark(userId, dto) {
        await this.validateTarget(dto.type, dto.targetId);
        const existing = await this.prisma.bookmark.findUnique({
            where: {
                userId_type_targetId: {
                    userId,
                    type: dto.type,
                    targetId: dto.targetId,
                },
            },
        });
        if (existing) {
            await this.prisma.bookmark.delete({ where: { id: existing.id } });
            return {
                bookmarked: false,
                message: 'از علاقه‌مندی‌ها حذف شد',
            };
        }
        else {
            await this.prisma.bookmark.create({
                data: {
                    userId,
                    type: dto.type,
                    targetId: dto.targetId,
                },
            });
            return {
                bookmarked: true,
                message: 'به علاقه‌مندی‌ها اضافه شد',
            };
        }
    }
    async getUserBookmarks(userId, query) {
        const { page, limit, type } = query;
        const skip = (page - 1) * limit;
        const where = { userId };
        if (type) {
            where.type = type;
        }
        const [bookmarks, total] = await Promise.all([
            this.prisma.bookmark.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            displayName: true,
                            avatar: true,
                        },
                    },
                },
            }),
            this.prisma.bookmark.count({ where }),
        ]);
        const enrichedBookmarks = await Promise.all(bookmarks.map(async (bookmark) => {
            let targetData = null;
            if (bookmark.type === 'REQUEST') {
                const request = await this.prisma.serviceRequest.findUnique({
                    where: { id: bookmark.targetId },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        budgetMin: true,
                        budgetMax: true,
                        budgetType: true,
                        city: true,
                        status: true,
                        category: {
                            select: { id: true, name: true, slug: true, icon: true },
                        },
                    },
                });
                targetData = request;
            }
            else if (bookmark.type === 'SPECIALIST') {
                const specialist = await this.prisma.user.findUnique({
                    where: { id: bookmark.targetId, role: 'SPECIALIST', isActive: true },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        displayName: true,
                        avatar: true,
                        city: true,
                        bio: true,
                        online: true,
                        reviews: {
                            select: { rating: true },
                            where: { isPublished: true },
                        },
                        _count: {
                            select: {
                                portfolios: { where: { isPublished: true } },
                                sentProposals: { where: { status: 'ACCEPTED' } },
                            },
                        },
                    },
                });
                if (specialist) {
                    const totalRating = specialist.reviews.reduce((sum, r) => sum + r.rating, 0);
                    const ratingCount = specialist.reviews.length;
                    const { reviews, _count, ...specialistData } = specialist;
                    targetData = {
                        ...specialistData,
                        ratingAverage: ratingCount > 0
                            ? Math.round((totalRating / ratingCount) * 10) / 10
                            : 0,
                        ratingCount,
                        portfolioCount: _count.portfolios,
                        completedProjects: _count.sentProposals,
                    };
                }
            }
            return {
                id: bookmark.id,
                type: bookmark.type,
                targetId: bookmark.targetId,
                target: targetData,
                createdAt: bookmark.createdAt,
            };
        }));
        return {
            bookmarks: enrichedBookmarks,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async isBookmarked(userId, type, targetId) {
        const bookmark = await this.prisma.bookmark.findUnique({
            where: {
                userId_type_targetId: {
                    userId,
                    type,
                    targetId,
                },
            },
        });
        return {
            bookmarked: !!bookmark,
        };
    }
    async removeBookmark(userId, type, targetId) {
        const bookmark = await this.prisma.bookmark.findUnique({
            where: {
                userId_type_targetId: {
                    userId,
                    type,
                    targetId,
                },
            },
        });
        if (!bookmark) {
            throw new common_1.NotFoundException('علاقه‌مندی یافت نشد');
        }
        await this.prisma.bookmark.delete({ where: { id: bookmark.id } });
        return {
            message: 'علاقه‌مندی با موفقیت حذف شد',
        };
    }
    async validateTarget(type, targetId) {
        if (type === 'REQUEST') {
            const request = await this.prisma.serviceRequest.findUnique({
                where: { id: targetId },
            });
            if (!request) {
                throw new common_1.BadRequestException('نیاز مورد نظر یافت نشد');
            }
        }
        else if (type === 'SPECIALIST') {
            const user = await this.prisma.user.findUnique({
                where: { id: targetId, role: 'SPECIALIST', isActive: true },
            });
            if (!user) {
                throw new common_1.BadRequestException('کسب‌وکار مورد نظر یافت نشد');
            }
        }
        else {
            throw new common_1.BadRequestException('نوع علاقه‌مندی نامعتبر است');
        }
    }
};
exports.BookmarksService = BookmarksService;
exports.BookmarksService = BookmarksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookmarksService);
//# sourceMappingURL=bookmarks.service.js.map