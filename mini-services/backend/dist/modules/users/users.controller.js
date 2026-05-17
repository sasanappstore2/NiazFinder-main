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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const query_users_dto_1 = require("./dto/query-users.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const search_users_dto_1 = require("./dto/search-users.dto");
const jwt_auth_guard_1 = require("@/common/guards/jwt-auth.guard");
const roles_decorator_1 = require("@/common/decorators/roles.decorator");
const current_user_decorator_1 = require("@/common/decorators/current-user.decorator");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async findAll(query) {
        return this.usersService.adminGetAll(query);
    }
    async searchUsers(query) {
        return this.usersService.searchUsers(query.query);
    }
    async getCurrentUser(user) {
        return this.usersService.findById(user.id);
    }
    async updateProfile(user, dto) {
        return this.usersService.updateProfile(user.id, dto);
    }
    async updateAvatar(user, body) {
        return this.usersService.updateAvatar(user.id, body.avatarUrl);
    }
    async changePassword(user, dto) {
        return this.usersService.changePassword(user.id, dto);
    }
    async getProfileCompletion(user) {
        return this.usersService.getProfileCompletion(user.id);
    }
    async getDashboardStats(user) {
        return this.usersService.getDashboardStats(user.id);
    }
    async findOne(id) {
        return this.usersService.findById(id);
    }
    async deactivateUser(id) {
        return this.usersService.deactivateUser(id);
    }
    async toggleStatus(id, data) {
        return this.usersService.adminToggleStatus(id, data);
    }
    async getSpecialistProfile(id) {
        return this.usersService.getSpecialistProfile(id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'لیست کاربران (مدیر)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'لیست کاربران با صفحه‌بندی' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'دسترسی غیرمجاز' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_users_dto_1.QueryUsersDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'جستجوی کاربران' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'نتایج جستجو' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_users_dto_1.SearchUsersDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "searchUsers", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'پروفایل کاربر فعلی' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'اطلاعات کاربر فعلی' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'احراز هویت ناموفق' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getCurrentUser", null);
__decorate([
    (0, common_1.Put)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'بروزرسانی پروفایل کاربر فعلی' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'پروفایل بروزرسانی شد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)('me/avatar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'بروزرسانی آواتار کاربر' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'آواتار بروزرسانی شد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateAvatar", null);
__decorate([
    (0, common_1.Put)('me/password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'تغییر رمز عبور' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'رمز عبور تغییر کرد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Get)('me/completion'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'درصد تکمیل پروفایل' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'درصد تکمیل پروفایل' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfileCompletion", null);
__decorate([
    (0, common_1.Get)('dashboard/stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'آمار داشبورد کاربر' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'آمار کاربر' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'احراز هویت ناموفق' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'مشاهده پروفایل کاربر (عمومی)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'اطلاعات کاربر' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'کاربر یافت نشد' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'غیرفعال‌سازی کاربر (مدیر)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'کاربر غیرفعال شد' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'دسترسی غیرمجاز' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'کاربر یافت نشد' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deactivateUser", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'تغییر وضعیت کاربر (مدیر)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'وضعیت کاربر تغییر کرد' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'دسترسی غیرمجاز' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'کاربر یافت نشد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "toggleStatus", null);
__decorate([
    (0, common_1.Get)('specialists/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'پروفایل کامل کسب‌وکار' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'اطلاعات کسب‌وکار' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'کسب‌وکار یافت نشد' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSpecialistProfile", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map