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
exports.SpecialistsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../entities/user.entity");
const portfolio_entity_1 = require("../../entities/portfolio.entity");
const review_entity_1 = require("../../entities/review.entity");
const proposal_entity_1 = require("../../entities/proposal.entity");
const skill_entity_1 = require("../../entities/skill.entity");
const user_skill_entity_1 = require("../../entities/user-skill.entity");
const slugify = require("slugify");
let SpecialistsService = class SpecialistsService {
    constructor(userRepo, portfolioRepo, reviewRepo, proposalRepo, skillRepo, userSkillRepo) {
        this.userRepo = userRepo;
        this.portfolioRepo = portfolioRepo;
        this.reviewRepo = reviewRepo;
        this.proposalRepo = proposalRepo;
        this.skillRepo = skillRepo;
        this.userSkillRepo = userSkillRepo;
    }
    async findAll(query) {
        const { categoryId, city, province, minRating, search, sort = 'newest', page = 1, limit = 20, } = query;
        const qb = this.userRepo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.skills', 'userSkill')
            .leftJoinAndSelect('userSkill.skill', 'skill')
            .leftJoin('user.reviews', 'review', 'review.isPublished = :isPublished', { isPublished: true })
            .where('user.role = :role', { role: user_entity_1.UserRole.SPECIALIST })
            .andWhere('user.isActive = :isActive', { isActive: true });
        if (city) {
            qb.andWhere('user.city = :city', { city });
        }
        if (province) {
            qb.andWhere('user.province = :province', { province });
        }
        if (search) {
            qb.andWhere('(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.displayName ILIKE :search OR user.bio ILIKE :search OR skill.name ILIKE :search)', { search: `%${search}%` });
        }
        if (categoryId) {
            qb.andWhere('skill.categoryId = :categoryId', { categoryId });
        }
        const skip = (page - 1) * limit;
        qb.skip(skip).take(limit * 2);
        qb.orderBy('user.createdAt', 'DESC');
        qb.addOrderBy('user.isVerified', 'DESC');
        const [users, total] = await qb.getManyAndCount();
        let specialists = await Promise.all(users.map(async (user) => {
            const avgRating = await this.getUserAvgRating(user.id);
            const completedProjects = await this.proposalRepo.count({
                where: { specialistId: user.id, status: proposal_entity_1.ProposalStatus.ACCEPTED },
            });
            const portfoliosCount = await this.portfolioRepo.count({
                where: { userId: user.id, isPublished: true },
            });
            const totalReviews = await this.reviewRepo.count({
                where: { targetUserId: user.id },
            });
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                displayName: user.displayName,
                avatar: user.avatar,
                bio: user.bio,
                city: user.city,
                province: user.province,
                isVerified: user.isVerified,
                createdAt: user.createdAt,
                skills: (user.skills || []).map((us) => ({
                    id: us.skillId,
                    name: us.skill?.name || '',
                    level: us.level,
                    icon: us.skill?.icon,
                })),
                avgRating,
                totalReviews,
                completedProjects,
                portfoliosCount,
            };
        }));
        if (minRating !== undefined && minRating > 0) {
            specialists = specialists.filter((s) => s.avgRating >= minRating);
        }
        switch (sort) {
            case 'rating':
                specialists.sort((a, b) => b.avgRating - a.avgRating);
                break;
            case 'experience':
                specialists.sort((a, b) => b.completedProjects - a.completedProjects);
                break;
            case 'price':
                specialists.sort((a, b) => b.completedProjects - a.completedProjects);
                break;
            case 'newest':
            default:
                specialists.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
        }
        return {
            data: specialists.slice(0, limit),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: ['skills', 'skills.skill'],
        });
        if (!user || user.role !== user_entity_1.UserRole.SPECIALIST) {
            throw new common_1.NotFoundException('کسب‌وکار مورد نظر یافت نشد');
        }
        const portfolios = await this.portfolioRepo.find({
            where: { userId: id, isPublished: true },
            order: { order: 'ASC' },
        });
        const reviews = await this.reviewRepo.find({
            where: { targetUserId: id },
            relations: ['author'],
            order: { createdAt: 'DESC' },
        });
        const avgRating = await this.getUserAvgRating(id);
        const completedProjects = await this.proposalRepo.count({
            where: { specialistId: id, status: proposal_entity_1.ProposalStatus.ACCEPTED },
        });
        const totalProposals = await this.proposalRepo.count({
            where: { specialistId: id },
        });
        const completionRate = totalProposals > 0
            ? Number(((completedProjects / totalProposals) * 100).toFixed(1))
            : 0;
        const detailedRatings = reviews.length > 0
            ? {
                avgQuality: this.calcAvg(reviews.map((r) => r.qualityRating)),
                avgTiming: this.calcAvg(reviews.map((r) => r.timingRating)),
                avgCommunication: this.calcAvg(reviews.map((r) => r.communicationRating)),
            }
            : null;
        return {
            ...user,
            skills: (user.skills || []).map((us) => ({
                id: us.id,
                skillId: us.skillId,
                skillName: us.skill?.name || '',
                skillSlug: us.skill?.slug || '',
                level: us.level,
                experience: us.experience,
            })),
            portfolios,
            reviews: reviews.map((r) => ({
                ...r,
                author: r.author
                    ? { id: r.author.id, firstName: r.author.firstName, lastName: r.author.lastName, avatar: r.author.avatar }
                    : null,
            })),
            avgRating,
            totalReviews: reviews.length,
            completedProjects,
            completionRate,
            detailedRatings,
            stats: {
                totalProposals,
                acceptedProposals: completedProjects,
                portfolios: portfolios.length,
            },
        };
    }
    async updateProfile(specialistId, dto) {
        const user = await this.userRepo.findOne({ where: { id: specialistId } });
        if (!user || user.role !== user_entity_1.UserRole.SPECIALIST) {
            throw new common_1.BadRequestException('فقط کسب‌وکارها می‌توانند پروفایل خود را بروزرسانی کنند');
        }
        if (dto.displayName !== undefined)
            user.displayName = dto.displayName;
        if (dto.bio !== undefined)
            user.bio = dto.bio;
        if (dto.city !== undefined)
            user.city = dto.city;
        if (dto.province !== undefined)
            user.province = dto.province;
        await this.userRepo.save(user);
        if (dto.skills) {
            await this.replaceSkills(specialistId, dto.skills.map((name) => ({ name, level: 3 })));
        }
        const updated = await this.userRepo.findOne({ where: { id: specialistId } });
        return {
            message: 'پروفایل با موفقیت بروزرسانی شد',
            data: updated,
        };
    }
    async updateSkills(specialistId, dto) {
        const user = await this.userRepo.findOne({ where: { id: specialistId } });
        if (!user || user.role !== user_entity_1.UserRole.SPECIALIST) {
            throw new common_1.BadRequestException('فقط کسب‌وکارها می‌توانند مهارت‌های خود را بروزرسانی کنند');
        }
        await this.replaceSkills(specialistId, dto.skills);
        const userSkills = await this.userSkillRepo.find({
            where: { userId: specialistId },
            relations: ['skill'],
            order: { level: 'DESC' },
        });
        return {
            message: 'مهارت‌ها با موفقیت بروزرسانی شد',
            data: userSkills.map((us) => ({
                id: us.id,
                skillId: us.skillId,
                skillName: us.skill?.name || '',
                level: us.level,
            })),
        };
    }
    async addPortfolio(specialistId, dto) {
        const user = await this.userRepo.findOne({ where: { id: specialistId } });
        if (!user || user.role !== user_entity_1.UserRole.SPECIALIST) {
            throw new common_1.BadRequestException('فقط کسب‌وکارها می‌توانند نمونه‌کار اضافه کنند');
        }
        const portfolio = this.portfolioRepo.create({
            userId: specialistId,
            title: dto.title,
            description: dto.description,
            imageUrls: dto.imageUrl ? JSON.stringify([dto.imageUrl]) : '[]',
            projectUrl: dto.projectUrl,
        });
        await this.portfolioRepo.save(portfolio);
        return {
            message: 'نمونه‌کار با موفقیت اضافه شد',
            data: portfolio,
        };
    }
    async updatePortfolio(specialistId, portfolioId, dto) {
        const portfolio = await this.portfolioRepo.findOne({
            where: { id: portfolioId },
        });
        if (!portfolio) {
            throw new common_1.NotFoundException('نمونه‌کار مورد نظر یافت نشد');
        }
        if (portfolio.userId !== specialistId) {
            throw new common_1.BadRequestException('شما فقط می‌توانید نمونه‌کارهای خود را ویرایش کنید');
        }
        if (dto.title !== undefined)
            portfolio.title = dto.title;
        if (dto.description !== undefined)
            portfolio.description = dto.description;
        if (dto.imageUrl !== undefined)
            portfolio.imageUrls = JSON.stringify([dto.imageUrl]);
        if (dto.projectUrl !== undefined)
            portfolio.projectUrl = dto.projectUrl;
        await this.portfolioRepo.save(portfolio);
        return {
            message: 'نمونه‌کار با موفقیت بروزرسانی شد',
            data: portfolio,
        };
    }
    async deletePortfolio(specialistId, portfolioId) {
        const portfolio = await this.portfolioRepo.findOne({
            where: { id: portfolioId },
        });
        if (!portfolio) {
            throw new common_1.NotFoundException('نمونه‌کار مورد نظر یافت نشد');
        }
        if (portfolio.userId !== specialistId) {
            throw new common_1.BadRequestException('شما فقط می‌توانید نمونه‌کارهای خود را حذف کنید');
        }
        await this.portfolioRepo.remove(portfolio);
        return { message: 'نمونه‌کار با موفقیت حذف شد' };
    }
    async getTopSpecialists(limit = 10) {
        const users = await this.userRepo.find({
            where: {
                role: user_entity_1.UserRole.SPECIALIST,
                isActive: true,
                isVerified: true,
            },
            relations: ['skills', 'skills.skill'],
            order: { createdAt: 'DESC' },
            take: limit * 3,
        });
        const specialistsWithRating = await Promise.all(users.map(async (user) => {
            const avgRating = await this.getUserAvgRating(user.id);
            const completedProjects = await this.proposalRepo.count({
                where: { specialistId: user.id, status: proposal_entity_1.ProposalStatus.ACCEPTED },
            });
            const totalReviews = await this.reviewRepo.count({
                where: { targetUserId: user.id },
            });
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                displayName: user.displayName,
                avatar: user.avatar,
                bio: user.bio,
                city: user.city,
                province: user.province,
                isVerified: user.isVerified,
                skills: (user.skills || []).map((us) => ({
                    id: us.skillId,
                    name: us.skill?.name || '',
                    level: us.level,
                })),
                avgRating,
                totalReviews,
                completedProjects,
            };
        }));
        specialistsWithRating.sort((a, b) => {
            if (b.avgRating !== a.avgRating)
                return b.avgRating - a.avgRating;
            return b.completedProjects - a.completedProjects;
        });
        return specialistsWithRating.slice(0, limit);
    }
    async search(query, filters = {}) {
        const qb = this.userRepo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.skills', 'userSkill')
            .leftJoinAndSelect('userSkill.skill', 'skill')
            .where('user.role = :role', { role: user_entity_1.UserRole.SPECIALIST })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .andWhere('(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.displayName ILIKE :query OR user.bio ILIKE :search OR skill.name ILIKE :search)', { query: `%${query}%`, search: `%${query}%` });
        if (filters.city) {
            qb.andWhere('user.city = :city', { city: filters.city });
        }
        if (filters.province) {
            qb.andWhere('user.province = :province', { province: filters.province });
        }
        if (filters.categoryId) {
            qb.andWhere('skill.categoryId = :categoryId', { categoryId: filters.categoryId });
        }
        qb.orderBy('user.isVerified', 'DESC').addOrderBy('user.createdAt', 'DESC').take(20);
        const users = await qb.getMany();
        const results = await Promise.all(users.map(async (user) => {
            const avgRating = await this.getUserAvgRating(user.id);
            if (filters.minRating && avgRating < filters.minRating)
                return null;
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                displayName: user.displayName,
                avatar: user.avatar,
                bio: user.bio,
                city: user.city,
                province: user.province,
                isVerified: user.isVerified,
                avgRating,
                skills: (user.skills || []).map((us) => ({
                    name: us.skill?.name || '',
                    level: us.level,
                })),
            };
        }));
        return results.filter(Boolean);
    }
    async getUserAvgRating(userId) {
        const reviews = await this.reviewRepo.find({
            where: { targetUserId: userId },
            select: { rating: true },
        });
        if (reviews.length === 0)
            return 0;
        return Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1));
    }
    calcAvg(values) {
        const filtered = values.filter((v) => v !== null && v !== undefined);
        if (filtered.length === 0)
            return 0;
        return Number((filtered.reduce((s, v) => s + v, 0) / filtered.length).toFixed(1));
    }
    async replaceSkills(userId, skills) {
        await this.userSkillRepo.delete({ userId });
        for (const item of skills) {
            const slug = slugify(item.name, { lower: true, strict: true });
            let skill = await this.skillRepo.findOne({ where: { slug } });
            if (!skill) {
                skill = this.skillRepo.create({ name: item.name, slug });
                await this.skillRepo.save(skill);
            }
            if (!skill)
                continue;
            const userSkill = this.userSkillRepo.create({
                userId,
                skillId: skill.id,
                level: item.level,
            });
            await this.userSkillRepo.save(userSkill);
        }
    }
};
exports.SpecialistsService = SpecialistsService;
exports.SpecialistsService = SpecialistsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(portfolio_entity_1.Portfolio)),
    __param(2, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(3, (0, typeorm_1.InjectRepository)(proposal_entity_1.Proposal)),
    __param(4, (0, typeorm_1.InjectRepository)(skill_entity_1.Skill)),
    __param(5, (0, typeorm_1.InjectRepository)(user_skill_entity_1.UserSkill)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _d : Object, typeof (_e = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _e : Object, typeof (_f = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _f : Object])
], SpecialistsService);
//# sourceMappingURL=specialists.service.js.map