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
var SearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let SearchService = SearchService_1 = class SearchService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SearchService_1.name);
        this.popularSearchesCache = new Map();
        this.suggestionsCache = new Map();
        this.CACHE_TTL_SUGGESTIONS = 30 * 60 * 1000;
        this.CACHE_TTL_POPULAR = 60 * 60 * 1000;
    }
    async search(params) {
        const { query, type = 'all', city, province, categoryId, minBudget, maxBudget, minRating, sort = 'relevance', page = 1, limit = 10, } = params;
        const normalizedQuery = query.trim().toLowerCase();
        const skip = (page - 1) * limit;
        if (normalizedQuery.length >= 2) {
            this.trackSearch(normalizedQuery);
        }
        const results = {};
        if (type === 'all' || type === 'requests') {
            results.requests = await this.searchRequests({
                query: normalizedQuery,
                city,
                province,
                categoryId,
                minBudget,
                maxBudget,
                sort,
                skip,
                limit,
            });
        }
        if (type === 'all' || type === 'specialists') {
            results.specialists = await this.searchSpecialists({
                query: normalizedQuery,
                city,
                province,
                categoryId,
                minRating,
                sort,
                skip,
                limit,
            });
        }
        return {
            query,
            type,
            results,
        };
    }
    async getSuggestions(query) {
        if (!query || query.trim().length < 1) {
            return { suggestions: [] };
        }
        const normalizedQuery = query.trim().toLowerCase();
        const cacheKey = `suggestions:${normalizedQuery}`;
        const cached = this.suggestionsCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return { suggestions: cached.data };
        }
        const suggestions = [];
        const categories = await this.prisma.category.findMany({
            where: {
                isActive: true,
                name: { contains: normalizedQuery },
            },
            select: { id: true, name: true, slug: true, icon: true },
            take: 3,
            orderBy: { order: 'asc' },
        });
        suggestions.push(...categories.map((c) => ({
            type: 'category',
            text: c.name,
            slug: c.slug,
            icon: c.icon,
        })));
        const cities = await this.prisma.user.groupBy({
            by: ['city'],
            where: {
                city: { contains: normalizedQuery, not: null },
                isActive: true,
                isBanned: false,
            },
            _count: { id: true },
            take: 3,
            orderBy: { _count: { id: 'desc' } },
        });
        suggestions.push(...cities.map((c) => ({
            type: 'city',
            text: c.city,
            count: c._count.id,
        })));
        const popularMatches = Array.from(this.popularSearchesCache.entries())
            .filter(([key]) => key.includes(normalizedQuery))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);
        suggestions.push(...popularMatches.map(([key, count]) => ({
            type: 'popular_search',
            text: key,
            count,
        })));
        const limited = suggestions.slice(0, 5);
        this.suggestionsCache.set(cacheKey, {
            data: limited,
            expiresAt: Date.now() + this.CACHE_TTL_SUGGESTIONS,
        });
        return { suggestions: limited };
    }
    async getPopularSearches() {
        const entries = Array.from(this.popularSearchesCache.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
        return {
            popularSearches: entries.map(([query, count]) => ({
                query,
                count,
            })),
        };
    }
    async searchRequests(options) {
        const { query, city, province, categoryId, minBudget, maxBudget, sort, skip, limit } = options;
        const where = {
            AND: [
                { status: { in: ['OPEN', 'IN_PROGRESS'] } },
            ],
        };
        if (query) {
            where.AND.push({
                OR: [
                    { title: { contains: query } },
                    { description: { contains: query } },
                    { tags: { has: query } },
                ],
            });
        }
        if (city) {
            where.AND.push({ city });
        }
        if (province) {
            where.AND.push({ province });
        }
        if (categoryId) {
            where.AND.push({ categoryId });
        }
        if (minBudget !== undefined) {
            where.AND.push({ budgetMin: { gte: minBudget } });
        }
        if (maxBudget !== undefined) {
            where.AND.push({ budgetMax: { lte: maxBudget } });
        }
        let orderBy = { createdAt: 'desc' };
        if (sort === 'price_low') {
            orderBy = { budgetMin: 'asc' };
        }
        else if (sort === 'price_high') {
            orderBy = { budgetMax: 'desc' };
        }
        else if (sort === 'newest') {
            orderBy = { createdAt: 'desc' };
        }
        else if (sort === 'relevance' && query) {
            orderBy = { createdAt: 'desc' };
        }
        const [requests, total] = await Promise.all([
            this.prisma.serviceRequest.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    description: true,
                    budgetMin: true,
                    budgetMax: true,
                    budgetType: true,
                    status: true,
                    city: true,
                    province: true,
                    isFeatured: true,
                    createdAt: true,
                    category: {
                        select: { id: true, name: true, slug: true, icon: true },
                    },
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            displayName: true,
                            avatar: true,
                            isVerified: true,
                        },
                    },
                    _count: {
                        select: { proposals: true },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.serviceRequest.count({ where }),
        ]);
        return {
            items: requests,
            total,
            page: Math.floor(skip / limit) + 1,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async searchSpecialists(options) {
        const { query, city, province, categoryId, minRating, sort, skip, limit } = options;
        const where = {
            AND: [
                { role: 'SPECIALIST' },
                { isActive: true },
                { isBanned: false },
            ],
        };
        if (query) {
            where.AND.push({
                OR: [
                    { firstName: { contains: query } },
                    { lastName: { contains: query } },
                    { displayName: { contains: query } },
                    { bio: { contains: query } },
                    {
                        skills: {
                            some: {
                                skill: {
                                    OR: [
                                        { name: { contains: query } },
                                        { description: { contains: query } },
                                    ],
                                },
                            },
                        },
                    },
                ],
            });
        }
        if (city) {
            where.AND.push({ city });
        }
        if (province) {
            where.AND.push({ province });
        }
        if (minRating !== undefined) {
            where.AND.push({ averageRating: { gte: minRating } });
        }
        if (categoryId) {
            where.AND.push({
                skills: {
                    some: {
                        skill: { categoryId },
                    },
                },
            });
        }
        let orderBy = { createdAt: 'desc' };
        if (sort === 'rating') {
            orderBy = { averageRating: 'desc' };
        }
        else if (sort === 'newest') {
            orderBy = { createdAt: 'desc' };
        }
        const [specialists, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    displayName: true,
                    avatar: true,
                    bio: true,
                    city: true,
                    province: true,
                    isVerified: true,
                    averageRating: true,
                    reviewCount: true,
                    createdAt: true,
                    skills: {
                        select: {
                            level: true,
                            experience: true,
                            skill: {
                                select: { id: true, name: true, slug: true, categoryId: true },
                            },
                        },
                        take: 5,
                    },
                    _count: {
                        select: {
                            reviews: true,
                            portfolios: true,
                        },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);
        const specialistIds = specialists.map((s) => s.id);
        if (specialistIds.length > 0) {
            const ratings = await this.prisma.review.groupBy({
                by: ['userId'],
                where: { userId: { in: specialistIds }, isPublished: true },
                _avg: { rating: true },
            });
            const ratingMap = new Map();
            ratings.forEach((r) => {
                if (r._avg.rating) {
                    ratingMap.set(r.userId, Math.round(r._avg.rating * 10) / 10);
                }
            });
            specialists.forEach((s) => {
                s.computedRating = ratingMap.get(s.id) || s.averageRating || 0;
            });
        }
        return {
            items: specialists,
            total,
            page: Math.floor(skip / limit) + 1,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    trackSearch(query) {
        const count = this.popularSearchesCache.get(query) || 0;
        this.popularSearchesCache.set(query, count + 1);
        if (this.popularSearchesCache.size > 1000) {
            const entries = Array.from(this.popularSearchesCache.entries())
                .sort((a, b) => b[1] - a[1]);
            this.popularSearchesCache = new Map(entries.slice(0, 500));
        }
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = SearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map