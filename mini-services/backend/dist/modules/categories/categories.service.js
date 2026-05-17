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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_entity_1 = require("../../entities/category.entity");
const proposal_entity_1 = require("../../entities/proposal.entity");
const request_entity_1 = require("../../entities/request.entity");
const user_entity_1 = require("../../entities/user.entity");
const slugify = require("slugify");
let CategoriesService = class CategoriesService {
    constructor(categoryRepo, proposalRepo, requestRepo, userRepo) {
        this.categoryRepo = categoryRepo;
        this.proposalRepo = proposalRepo;
        this.requestRepo = requestRepo;
        this.userRepo = userRepo;
    }
    async findAll() {
        const categories = await this.categoryRepo.find({
            where: { parentId: null, isActive: true },
            relations: ['children', 'children.children'],
            order: { order: 'ASC' },
        });
        const result = await Promise.all(categories.map(async (cat) => {
            const specialistCount = await this.countSpecialists(cat.id);
            const childrenWithStats = await Promise.all((cat.children || [])
                .filter((c) => c.isActive)
                .map(async (child) => {
                const childSpecialistCount = await this.countSpecialists(child.id);
                const requestCount = await this.requestRepo.count({
                    where: { categoryId: child.id, deletedAt: null },
                });
                const grandchildren = (child.children || [])
                    .filter((gc) => gc.isActive)
                    .map((gc) => ({
                    ...gc,
                    children: undefined,
                    parent: undefined,
                    requestCount: 0,
                    specialistCount: 0,
                }));
                return {
                    ...child,
                    children: undefined,
                    parent: undefined,
                    requestCount,
                    specialistCount: childSpecialistCount,
                    subCategories: grandchildren,
                };
            }));
            const requestCount = await this.requestRepo.count({
                where: { categoryId: cat.id, deletedAt: null },
            });
            return {
                ...cat,
                children: undefined,
                parent: undefined,
                requestCount,
                specialistCount,
                subCategories: childrenWithStats,
            };
        }));
        return { categories: result };
    }
    async findPopular() {
        const categories = await this.categoryRepo.find({
            where: { parentId: null, isActive: true },
            relations: ['children'],
            order: { order: 'ASC' },
        });
        const categoriesWithCounts = await Promise.all(categories.map(async (cat) => {
            const catRequestCount = await this.requestRepo.count({
                where: { categoryId: cat.id, deletedAt: null },
            });
            const childIds = (cat.children || []).filter((c) => c.isActive).map((c) => c.id);
            let childRequests = 0;
            if (childIds.length > 0) {
                childRequests = await this.requestRepo.count({
                    where: { categoryId: (0, typeorm_2.In)(childIds), deletedAt: null },
                });
            }
            return {
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                description: cat.description,
                icon: cat.icon,
                image: cat.image,
                requestCount: catRequestCount + childRequests,
                specialistCount: await this.countSpecialists(cat.id),
            };
        }));
        categoriesWithCounts.sort((a, b) => b.requestCount - a.requestCount);
        return { categories: categoriesWithCounts.slice(0, 8) };
    }
    async findById(id) {
        const category = await this.categoryRepo.findOne({
            where: { id },
            relations: ['parent', 'children'],
        });
        if (!category) {
            throw new common_1.NotFoundException('دسته‌بندی یافت نشد');
        }
        const specialistCount = await this.countSpecialists(id);
        const requestCount = await this.requestRepo.count({
            where: { categoryId: id, deletedAt: null },
        });
        const childrenWithStats = await Promise.all((category.children || [])
            .filter((c) => c.isActive)
            .map(async (child) => {
            const childRequestCount = await this.requestRepo.count({
                where: { categoryId: child.id, deletedAt: null },
            });
            return {
                ...child,
                children: undefined,
                parent: undefined,
                requestCount: childRequestCount,
                specialistCount: await this.countSpecialists(child.id),
            };
        }));
        return {
            ...category,
            children: undefined,
            parent: category.parent ? { id: category.parent.id, name: category.parent.name, slug: category.parent.slug } : null,
            requestCount,
            specialistCount,
            subCategories: childrenWithStats,
        };
    }
    async findChildren(parentId) {
        const parent = await this.categoryRepo.findOne({ where: { id: parentId } });
        if (!parent) {
            throw new common_1.NotFoundException('دسته‌بندی والد یافت نشد');
        }
        const children = await this.categoryRepo.find({
            where: { parentId, isActive: true },
            order: { order: 'ASC' },
        });
        const result = await Promise.all(children.map(async (child) => {
            const requestCount = await this.requestRepo.count({
                where: { categoryId: child.id, deletedAt: null },
            });
            return {
                ...child,
                children: undefined,
                parent: undefined,
                requestCount,
                specialistCount: await this.countSpecialists(child.id),
            };
        }));
        return {
            parent: { id: parent.id, name: parent.name, slug: parent.slug },
            subcategories: result,
        };
    }
    async create(dto) {
        const slug = slugify(dto.name, { lower: true, strict: true });
        const existing = await this.categoryRepo.findOne({ where: { slug } });
        if (existing) {
            throw new common_1.ConflictException('اسلاگ دسته‌بندی تکراری است');
        }
        if (dto.parentId) {
            const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
            if (!parent) {
                throw new common_1.NotFoundException('دسته‌بندی والد یافت نشد');
            }
        }
        const categoryData = {
            name: dto.name,
            slug,
            order: dto.order || 0,
        };
        if (dto.description)
            categoryData.description = dto.description;
        if (dto.icon)
            categoryData.icon = dto.icon;
        if (dto.image)
            categoryData.image = dto.image;
        if (dto.parentId)
            categoryData.parentId = dto.parentId;
        const category = this.categoryRepo.create(categoryData);
        await this.categoryRepo.save(category);
        return { category, message: 'دسته‌بندی با موفقیت ایجاد شد' };
    }
    async update(id, dto) {
        const category = await this.categoryRepo.findOne({ where: { id } });
        if (!category) {
            throw new common_1.NotFoundException('دسته‌بندی یافت نشد');
        }
        if (dto.name) {
            const newSlug = slugify(dto.name, { lower: true, strict: true });
            const existing = await this.categoryRepo.findOne({
                where: { slug: newSlug, id: (0, typeorm_2.Not)(id) },
            });
            if (existing && newSlug !== category.slug) {
                throw new common_1.ConflictException('اسلاگ دسته‌بندی تکراری است');
            }
            category.name = dto.name;
            category.slug = newSlug;
        }
        if (dto.description !== undefined)
            category.description = dto.description;
        if (dto.icon !== undefined)
            category.icon = dto.icon;
        if (dto.image !== undefined)
            category.image = dto.image;
        if (dto.order !== undefined)
            category.order = dto.order;
        if (dto.isActive !== undefined)
            category.isActive = dto.isActive;
        await this.categoryRepo.save(category);
        return { category, message: 'دسته‌بندی با موفقیت بروزرسانی شد' };
    }
    async delete(id) {
        const category = await this.categoryRepo.findOne({
            where: { id },
            relations: ['children'],
        });
        if (!category) {
            throw new common_1.NotFoundException('دسته‌بندی یافت نشد');
        }
        const requestCount = await this.requestRepo.count({
            where: { categoryId: id, deletedAt: null },
        });
        if (requestCount > 0) {
            throw new common_1.BadRequestException(`این دسته‌بندی دارای ${requestCount} درخواست فعال است و قابل حذف نیست`);
        }
        const activeChildren = (category.children || []).filter((c) => c.isActive);
        if (activeChildren.length > 0) {
            throw new common_1.BadRequestException('ابتدا زیردسته‌های فعال این دسته‌بندی را حذف یا غیرفعال کنید');
        }
        category.isActive = false;
        await this.categoryRepo.save(category);
        return { category, message: 'دسته‌بندی با موفقیت غیرفعال شد' };
    }
    async incrementRequestCount(categoryId) {
        await this.categoryRepo.increment({ id: categoryId }, 'requestCount', 1);
    }
    async countSpecialists(categoryId) {
        const subcategories = await this.categoryRepo.find({
            where: { parentId: categoryId },
            select: { id: true },
        });
        const categoryIds = [categoryId, ...subcategories.map((c) => c.id)];
        const result = await this.proposalRepo
            .createQueryBuilder('proposal')
            .leftJoin('proposal.request', 'request')
            .leftJoin('proposal.specialist', 'specialist')
            .select('DISTINCT proposal.specialistId', 'id')
            .where('request.categoryId IN (:...categoryIds)', { categoryIds })
            .andWhere('specialist.role = :role', { role: 'SPECIALIST' })
            .andWhere('specialist.isActive = :isActive', { isActive: true })
            .getRawMany();
        return result.length;
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __param(1, (0, typeorm_1.InjectRepository)(proposal_entity_1.Proposal)),
    __param(2, (0, typeorm_1.InjectRepository)(request_entity_1.Request)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _d : Object])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map