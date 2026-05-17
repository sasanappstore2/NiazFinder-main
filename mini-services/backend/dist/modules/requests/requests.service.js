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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const request_entity_1 = require("../../entities/request.entity");
const category_entity_1 = require("../../entities/category.entity");
const user_entity_1 = require("../../entities/user.entity");
const proposal_entity_1 = require("../../entities/proposal.entity");
const review_entity_1 = require("../../entities/review.entity");
const notification_entity_1 = require("../../entities/notification.entity");
const redis_service_1 = require("../../common/redis/redis.service");
const slugify = require("slugify");
let RequestsService = class RequestsService {
    constructor(requestRepo, categoryRepo, userRepo, proposalRepo, reviewRepo, notificationRepo, redis) {
        this.requestRepo = requestRepo;
        this.categoryRepo = categoryRepo;
        this.userRepo = userRepo;
        this.proposalRepo = proposalRepo;
        this.reviewRepo = reviewRepo;
        this.notificationRepo = notificationRepo;
        this.redis = redis;
    }
    async create(userId, dto) {
        const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
        if (!category) {
            throw new common_1.NotFoundException('دسته‌بندی مورد نظر یافت نشد');
        }
        let slug = slugify(dto.title, { lower: true, strict: true });
        let counter = 1;
        while (await this.requestRepo.findOne({ where: { slug } })) {
            slug = `${slugify(dto.title, { lower: true, strict: true })}-${counter}`;
            counter++;
        }
        const request = this.requestRepo.create({
            title: dto.title,
            slug,
            description: dto.description,
            categoryId: dto.categoryId,
            budgetMin: dto.budgetMin,
            budgetMax: dto.budgetMax,
            budgetType: (dto.budgetType || 'FIXED'),
            deliveryTime: dto.deliveryTime,
            deliveryUnit: (dto.deliveryUnit || 'day'),
            city: dto.city,
            province: dto.province,
            priority: (dto.priority || 'NORMAL'),
            tags: dto.tags || [],
            userId,
        });
        await this.requestRepo.save(request);
        await this.categoryRepo.increment({ id: dto.categoryId }, 'requestCount', 1);
        await this.redis.publish('requests:created', {
            requestId: request.id,
            categoryId: dto.categoryId,
            city: dto.city,
            province: dto.province,
            userId,
        });
        await this.notifyMatchingSpecialists(request, category);
        const savedRequest = await this.requestRepo.findOne({
            where: { id: request.id },
            relations: ['category', 'user'],
        });
        return savedRequest;
    }
    async findAll(query) {
        const { page = 1, limit = 12, categoryId, city, province, status, priority, search, sort = 'newest', } = query;
        const qb = this.requestRepo
            .createQueryBuilder('request')
            .leftJoinAndSelect('request.category', 'category')
            .leftJoinAndSelect('request.user', 'user')
            .leftJoinAndSelect('request.proposals', 'proposals')
            .where('request.deletedAt IS NULL');
        if (categoryId) {
            qb.andWhere('request.categoryId = :categoryId', { categoryId });
        }
        if (city) {
            qb.andWhere('request.city = :city', { city });
        }
        if (province) {
            qb.andWhere('request.province = :province', { province });
        }
        if (status) {
            qb.andWhere('request.status = :status', { status });
        }
        if (priority) {
            qb.andWhere('request.priority = :priority', { priority });
        }
        if (search) {
            qb.andWhere('(request.title ILIKE :search OR request.description ILIKE :search)', { search: `%${search}%` });
        }
        switch (sort) {
            case 'oldest':
                qb.orderBy('request.createdAt', 'ASC');
                break;
            case 'budget_low':
                qb.orderBy('COALESCE(request.budgetMin, 0)', 'ASC');
                break;
            case 'budget_high':
                qb.orderBy('COALESCE(request.budgetMax, 0)', 'DESC');
                break;
            case 'most_proposals':
                qb.orderBy('request.proposalCount', 'DESC');
                break;
            case 'newest':
            default:
                qb.orderBy('request.createdAt', 'DESC');
                break;
        }
        const skip = (page - 1) * limit;
        qb.skip(skip).take(limit);
        const [items, total] = await qb.getManyAndCount();
        return {
            items: items.map((item) => ({
                ...item,
                proposalCount: item.proposals?.length || item.proposalCount || 0,
                proposals: undefined,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findById(id, sessionId) {
        const request = await this.requestRepo.findOne({
            where: { id },
            relations: ['category', 'user', 'proposals', 'proposals.specialist'],
        });
        if (!request) {
            throw new common_1.NotFoundException('درخواست مورد نظر یافت نشد');
        }
        const shouldIncrement = await this.shouldIncrementView(id, sessionId);
        if (shouldIncrement) {
            await this.requestRepo.increment({ id }, 'viewCount', 1);
            request.viewCount += 1;
        }
        return {
            ...request,
            proposals: (request.proposals || []).map((p) => ({
                ...p,
                specialist: p.specialist ? {
                    id: p.specialist.id,
                    firstName: p.specialist.firstName,
                    lastName: p.specialist.lastName,
                    displayName: p.specialist.displayName,
                    avatar: p.specialist.avatar,
                    city: p.specialist.city,
                    isVerified: p.specialist.isVerified,
                } : null,
            })),
        };
    }
    async update(id, userId, dto) {
        const request = await this.requestRepo.findOne({
            where: { id },
            relations: ['user'],
        });
        if (!request) {
            throw new common_1.NotFoundException('درخواست مورد نظر یافت نشد');
        }
        const isAdmin = request.user.role === 'ADMIN' || request.user.role === 'SUPER_ADMIN';
        if (request.userId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('شما فقط می‌توانید درخواست‌های خود را ویرایش کنید');
        }
        if (request.status !== request_entity_1.RequestStatus.OPEN && !isAdmin) {
            throw new common_1.BadRequestException('فقط درخواست‌های باز قابل ویرایش هستند');
        }
        if (dto.categoryId) {
            const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
            if (!category) {
                throw new common_1.NotFoundException('دسته‌بندی مورد نظر یافت نشد');
            }
        }
        if (dto.title && dto.title !== request.title) {
            let slug = slugify(dto.title, { lower: true, strict: true });
            let counter = 1;
            while (await this.requestRepo.findOne({ where: { slug } })) {
                slug = `${slugify(dto.title, { lower: true, strict: true })}-${counter}`;
                counter++;
            }
            request.slug = slug;
            request.title = dto.title;
        }
        if (dto.description !== undefined)
            request.description = dto.description;
        if (dto.categoryId !== undefined)
            request.categoryId = dto.categoryId;
        if (dto.budgetMin !== undefined)
            request.budgetMin = dto.budgetMin;
        if (dto.budgetMax !== undefined)
            request.budgetMax = dto.budgetMax;
        if (dto.budgetType !== undefined)
            request.budgetType = dto.budgetType;
        if (dto.deliveryTime !== undefined)
            request.deliveryTime = dto.deliveryTime;
        if (dto.deliveryUnit !== undefined)
            request.deliveryUnit = dto.deliveryUnit;
        if (dto.city !== undefined)
            request.city = dto.city;
        if (dto.province !== undefined)
            request.province = dto.province;
        if (dto.priority !== undefined)
            request.priority = dto.priority;
        if (dto.tags !== undefined)
            request.tags = dto.tags;
        await this.requestRepo.save(request);
        await this.redis.publish('requests:updated', { requestId: id, userId });
        const updated = await this.requestRepo.findOne({
            where: { id },
            relations: ['category', 'user'],
        });
        return updated;
    }
    async delete(id, userId) {
        const request = await this.requestRepo.findOne({
            where: { id },
            relations: ['user'],
        });
        if (!request) {
            throw new common_1.NotFoundException('درخواست مورد نظر یافت نشد');
        }
        const isAdmin = request.user.role === 'ADMIN' || request.user.role === 'SUPER_ADMIN';
        if (request.userId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('شما فقط می‌توانید درخواست‌های خود را حذف کنید');
        }
        if (request.status !== request_entity_1.RequestStatus.OPEN && !isAdmin) {
            throw new common_1.BadRequestException('فقط درخواست‌های باز قابل حذف هستند');
        }
        request.status = request_entity_1.RequestStatus.CANCELLED;
        await this.requestRepo.softRemove(request);
        await this.requestRepo.save(request);
        await this.redis.publish('requests:deleted', { requestId: id, userId });
        return { message: 'درخواست با موفقیت حذف شد' };
    }
    async updateStatus(id, status, userId) {
        const request = await this.requestRepo.findOne({
            where: { id },
            relations: ['user'],
        });
        if (!request) {
            throw new common_1.NotFoundException('درخواست مورد نظر یافت نشد');
        }
        const validTransitions = {
            OPEN: ['IN_PROGRESS', 'CANCELLED', 'EXPIRED'],
            IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
            COMPLETED: [],
            CANCELLED: [],
            EXPIRED: [],
        };
        const allowed = validTransitions[request.status];
        if (!allowed || !allowed.includes(status)) {
            throw new common_1.BadRequestException(`تغییر وضعیت از ${request.status} به ${status} مجاز نیست`);
        }
        request.status = status;
        await this.requestRepo.save(request);
        if (userId && request.userId !== userId) {
            await this.notificationRepo.save(this.notificationRepo.create({
                userId: request.userId,
                type: 'REQUEST_STATUS_CHANGED',
                title: 'تغییر وضعیت درخواست',
                body: `وضعیت درخواست "${request.title}" به "${status}" تغییر یافت`,
                data: { requestId: id, status },
            }));
        }
        await this.redis.publish('requests:status_changed', {
            requestId: id,
            status,
            userId: request.userId,
        });
        return request;
    }
    async findByUser(userId, query) {
        const { page = 1, limit = 12, status, sort = 'newest' } = query;
        const qb = this.requestRepo
            .createQueryBuilder('request')
            .leftJoinAndSelect('request.category', 'category')
            .where('request.userId = :userId', { userId })
            .andWhere('request.deletedAt IS NULL');
        if (status) {
            qb.andWhere('request.status = :status', { status });
        }
        switch (sort) {
            case 'oldest':
                qb.orderBy('request.createdAt', 'ASC');
                break;
            case 'budget_low':
                qb.orderBy('COALESCE(request.budgetMin, 0)', 'ASC');
                break;
            case 'budget_high':
                qb.orderBy('COALESCE(request.budgetMax, 0)', 'DESC');
                break;
            case 'most_proposals':
                qb.orderBy('request.proposalCount', 'DESC');
                break;
            default:
                qb.orderBy('request.createdAt', 'DESC');
        }
        const skip = (page - 1) * limit;
        qb.skip(skip).take(limit);
        const [items, total] = await qb.getManyAndCount();
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async search(query, filters = {}) {
        const qb = this.requestRepo
            .createQueryBuilder('request')
            .leftJoinAndSelect('request.category', 'category')
            .leftJoinAndSelect('request.user', 'user')
            .where('request.deletedAt IS NULL')
            .andWhere('(request.title ILIKE :query OR request.description ILIKE :query OR :tag ANY(request.tags))', { query: `%${query}%`, tag: query });
        if (filters.categoryId) {
            qb.andWhere('request.categoryId = :categoryId', { categoryId: filters.categoryId });
        }
        if (filters.city) {
            qb.andWhere('request.city = :city', { city: filters.city });
        }
        if (filters.province) {
            qb.andWhere('request.province = :province', { province: filters.province });
        }
        if (filters.status) {
            qb.andWhere('request.status = :status', { status: filters.status });
        }
        qb.orderBy('request.createdAt', 'DESC').take(20);
        return qb.getMany();
    }
    async getStats() {
        const [total, open, inProgress, completed, cancelled, expired,] = await Promise.all([
            this.requestRepo.count({ where: { deletedAt: null } }),
            this.requestRepo.count({ where: { status: request_entity_1.RequestStatus.OPEN, deletedAt: null } }),
            this.requestRepo.count({ where: { status: request_entity_1.RequestStatus.IN_PROGRESS, deletedAt: null } }),
            this.requestRepo.count({ where: { status: request_entity_1.RequestStatus.COMPLETED, deletedAt: null } }),
            this.requestRepo.count({ where: { status: request_entity_1.RequestStatus.CANCELLED, deletedAt: null } }),
            this.requestRepo.count({ where: { status: request_entity_1.RequestStatus.EXPIRED, deletedAt: null } }),
        ]);
        const totalViews = await this.requestRepo
            .createQueryBuilder('request')
            .select('COALESCE(SUM(request.viewCount), 0)', 'total')
            .where('request.deletedAt IS NULL')
            .getRawOne();
        const totalProposals = await this.requestRepo
            .createQueryBuilder('request')
            .select('COALESCE(SUM(request.proposalCount), 0)', 'total')
            .where('request.deletedAt IS NULL')
            .getRawOne();
        return {
            total,
            open,
            inProgress,
            completed,
            cancelled,
            expired,
            totalViews: parseInt(totalViews?.total || '0'),
            totalProposals: parseInt(totalProposals?.total || '0'),
        };
    }
    async shouldIncrementView(requestId, sessionId) {
        if (!sessionId)
            return true;
        const key = `view:request:${requestId}:${sessionId}`;
        return await this.redis.isAllowed(key, 3600, 1);
    }
    async notifyMatchingSpecialists(request, category) {
        try {
            const specialists = await this.userRepo
                .createQueryBuilder('user')
                .leftJoin('user.skills', 'skill')
                .where('user.role = :role', { role: 'SPECIALIST' })
                .andWhere('user.isActive = :isActive', { isActive: true })
                .andWhere('(skill.categoryId = :categoryId OR (user.city = :city AND :city IS NOT NULL) OR (user.province = :province AND :province IS NOT NULL))', {
                categoryId: category.id,
                city: request.city || null,
                province: request.province || null,
            })
                .select('user.id')
                .distinct(true)
                .limit(50)
                .getMany();
            const notifications = specialists.map((specialist) => this.notificationRepo.create({
                userId: specialist.id,
                type: 'NEW_REQUEST_MATCH',
                title: 'درخواست جدید مطابق تخصص شما',
                body: `یک درخواست جدید در دسته‌بندی "${category.name}" ثبت شد`,
                data: {
                    requestId: request.id,
                    categoryId: category.id,
                    title: request.title,
                },
            }));
            if (notifications.length > 0) {
                await this.notificationRepo.save(notifications);
            }
        }
        catch {
        }
    }
};
exports.RequestsService = RequestsService;
exports.RequestsService = RequestsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(request_entity_1.Request)),
    __param(1, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(proposal_entity_1.Proposal)),
    __param(4, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(5, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _d : Object, typeof (_e = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _e : Object, typeof (_f = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _f : Object, redis_service_1.RedisService])
], RequestsService);
//# sourceMappingURL=requests.service.js.map