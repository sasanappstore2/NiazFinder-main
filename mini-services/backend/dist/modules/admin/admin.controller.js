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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const query_admin_users_dto_1 = require("./dto/query-admin-users.dto");
const toggle_user_status_dto_1 = require("./dto/toggle-user-status.dto");
const manage_request_dto_1 = require("./dto/manage-request.dto");
const create_coupon_dto_1 = require("./dto/create-coupon.dto");
const query_admin_logs_dto_1 = require("./dto/query-admin-logs.dto");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getStats() {
        return this.adminService.getDashboardStats();
    }
    async getUsers(query) {
        return this.adminService.getUsers(query);
    }
    async toggleUserStatus(adminId, userId, dto) {
        return this.adminService.toggleUserStatus(adminId, userId, dto);
    }
    async manageRequest(adminId, requestId, dto) {
        return this.adminService.manageRequest(adminId, requestId, dto);
    }
    async getAuditLogs(query) {
        return this.adminService.getAuditLogs(query);
    }
    async getSystemHealth() {
        return this.adminService.getSystemHealth();
    }
    async createCoupon(adminId, dto) {
        return this.adminService.createCoupon(adminId, dto);
    }
    async getCoupons() {
        return this.adminService.getCoupons();
    }
    async deleteCoupon(adminId, couponId) {
        return this.adminService.deleteCoupon(adminId, couponId);
    }
    async getReports(status, page, limit) {
        return this.adminService.getReports({
            status,
            page: Number(page),
            limit: Number(limit),
        });
    }
    async getRecentActivity() {
        return this.adminService.getRecentActivity();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'آمار کلی پنل مدیریت' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'مدیریت کاربران (لیست، جستجو، فیلتر)' }),
    (0, swagger_1.ApiQuery)({ name: 'role', required: false, description: 'فیلتر نقش' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'فیلتر وضعیت' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, description: 'جستجو' }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', required: false, description: 'مرتب‌سازی' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'شماره صفحه' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'تعداد در هر صفحه' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_admin_users_dto_1.QueryAdminUsersDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Put)('users/:id/toggle-status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'فعال/غیرفعال کردن کاربر' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'شناسه کاربر' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, toggle_user_status_dto_1.ToggleUserStatusDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "toggleUserStatus", null);
__decorate([
    (0, common_1.Put)('requests/:id/manage'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'مدیریت درخواست (ویژه، مخفی، تغییر وضعیت)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'شناسه درخواست' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, manage_request_dto_1.ManageRequestDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "manageRequest", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'لاگ‌های سیستم و حسابرسی' }),
    (0, swagger_1.ApiQuery)({ name: 'adminId', required: false, description: 'شناسه ادمین' }),
    (0, swagger_1.ApiQuery)({ name: 'action', required: false, description: 'نوع عملیات' }),
    (0, swagger_1.ApiQuery)({ name: 'entity', required: false, description: 'نوع موجودیت' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, description: 'شناسه کاربر' }),
    (0, swagger_1.ApiQuery)({ name: 'dateFrom', required: false, description: 'تاریخ شروع' }),
    (0, swagger_1.ApiQuery)({ name: 'dateTo', required: false, description: 'تاریخ پایان' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_admin_logs_dto_1.QueryAdminLogsDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('system-health'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'وضعیت سلامت سیستم' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSystemHealth", null);
__decorate([
    (0, common_1.Post)('coupons'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'ایجاد کد تخفیف' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_coupon_dto_1.CreateCouponDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createCoupon", null);
__decorate([
    (0, common_1.Get)('coupons'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'لیست کدهای تخفیف' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getCoupons", null);
__decorate([
    (0, common_1.Delete)('coupons/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'حذف کد تخفیف' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'شناسه کد تخفیف' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteCoupon", null);
__decorate([
    (0, common_1.Get)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'مدیریت گزارش‌ها' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'فیلتر وضعیت' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'شماره صفحه' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'تعداد در هر صفحه' }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getReports", null);
__decorate([
    (0, common_1.Get)('activity'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'فعالیت‌های اخیر پلتفرم' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRecentActivity", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map