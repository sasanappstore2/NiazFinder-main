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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialistsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const specialists_service_1 = require("./specialists.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const update_specialist_profile_dto_1 = require("./dto/update-specialist-profile.dto");
const update_skills_dto_1 = require("./dto/update-skills.dto");
const create_portfolio_dto_1 = require("./dto/create-portfolio.dto");
const update_portfolio_dto_1 = require("./dto/update-portfolio.dto");
const query_specialists_dto_1 = require("./dto/query-specialists.dto");
let SpecialistsController = class SpecialistsController {
    constructor(specialistsService) {
        this.specialistsService = specialistsService;
    }
    async findAll(query) {
        return this.specialistsService.findAll(query);
    }
    async getTopSpecialists(limit) {
        const parsedLimit = limit ? parseInt(limit, 10) : 10;
        return this.specialistsService.getTopSpecialists(Math.min(parsedLimit, 50));
    }
    async search(q, city, province, minRating, categoryId) {
        if (!q) {
            return { data: [], message: 'عبارت جستجو الزامی است' };
        }
        return this.specialistsService.search(q, {
            city,
            province,
            minRating: minRating ? parseFloat(minRating) : undefined,
            categoryId,
        });
    }
    async getMyProfile(userId) {
        return this.specialistsService.findById(userId);
    }
    async getMyPortfolio(userId) {
        const profile = await this.specialistsService.findById(userId);
        return { data: profile.portfolios };
    }
    async findOne(id) {
        return this.specialistsService.findById(id);
    }
    async updateProfile(userId, dto) {
        return this.specialistsService.updateProfile(userId, dto);
    }
    async updateSkills(userId, dto) {
        return this.specialistsService.updateSkills(userId, dto);
    }
    async addPortfolio(userId, dto) {
        return this.specialistsService.addPortfolio(userId, dto);
    }
    async updatePortfolio(userId, portfolioId, dto) {
        return this.specialistsService.updatePortfolio(userId, portfolioId, dto);
    }
    async deletePortfolio(userId, portfolioId) {
        return this.specialistsService.deletePortfolio(userId, portfolioId);
    }
};
exports.SpecialistsController = SpecialistsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'لیست کسب‌وکارها با فیلتر (عمومی، صفحه‌بندی شده)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_specialists_dto_1.QuerySpecialistsDto]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('top'),
    (0, swagger_1.ApiOperation)({ summary: 'کسب‌وکارهای برتر (عمومی)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'لیست متخصصین برتر بر اساس امتیاز' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "getTopSpecialists", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'جستجوی کسب‌وکارها (عمومی)' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('city')),
    __param(2, (0, common_1.Query)('province')),
    __param(3, (0, common_1.Query)('minRating')),
    __param(4, (0, common_1.Query)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('me/profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'پروفایل من (محافظت شده)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)('me/portfolio'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'نمونه‌کارهای من (محافظت شده)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "getMyPortfolio", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'پروفایل کسب‌وکار (عمومی)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'پروفایل کامل متخصص' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'کسب‌وکار یافت نشد' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)('me/profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'بروزرسانی پروفایل (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'پروفایل بروزرسانی شد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_specialist_profile_dto_1.UpdateSpecialistProfileDto]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)('me/skills'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'بروزرسانی مهارت‌ها (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'مهارت‌ها بروزرسانی شد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_skills_dto_1.UpdateSkillsDto]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "updateSkills", null);
__decorate([
    (0, common_1.Post)('me/portfolio'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'افزودن نمونه‌کار (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'نمونه‌کار اضافه شد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_portfolio_dto_1.CreatePortfolioDto]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "addPortfolio", null);
__decorate([
    (0, common_1.Put)('me/portfolio/:portfolioId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'بروزرسانی نمونه‌کار (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'نمونه‌کار بروزرسانی شد' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'نمونه‌کار یافت نشد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('portfolioId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_portfolio_dto_1.UpdatePortfolioDto]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "updatePortfolio", null);
__decorate([
    (0, common_1.Delete)('me/portfolio/:portfolioId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'حذف نمونه‌کار (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'نمونه‌کار حذف شد' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'نمونه‌کار یافت نشد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('portfolioId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpecialistsController.prototype, "deletePortfolio", null);
exports.SpecialistsController = SpecialistsController = __decorate([
    (0, swagger_1.ApiTags)('Specialists'),
    (0, common_1.Controller)('specialists'),
    __metadata("design:paramtypes", [specialists_service_1.SpecialistsService])
], SpecialistsController);
//# sourceMappingURL=specialists.controller.js.map