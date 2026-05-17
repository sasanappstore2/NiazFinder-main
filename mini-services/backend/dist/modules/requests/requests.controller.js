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
exports.RequestsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const requests_service_1 = require("./requests.service");
const create_request_dto_1 = require("./dto/create-request.dto");
const update_request_dto_1 = require("./dto/update-request.dto");
const query_requests_dto_1 = require("./dto/query-requests.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let RequestsController = class RequestsController {
    constructor(requestsService) {
        this.requestsService = requestsService;
    }
    async findAll(query) {
        return this.requestsService.findAll(query);
    }
    async create(userId, dto) {
        return this.requestsService.create(userId, dto);
    }
    async getMyRequests(userId, query) {
        return this.requestsService.findByUser(userId, query);
    }
    async getStats() {
        return this.requestsService.getStats();
    }
    async findOne(id, sessionId) {
        return this.requestsService.findById(id, sessionId);
    }
    async update(id, userId, dto) {
        return this.requestsService.update(id, userId, dto);
    }
    async remove(id, userId) {
        return this.requestsService.delete(id, userId);
    }
};
exports.RequestsController = RequestsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'لیست درخواست‌ها (عمومی، صفحه‌بندی شده، قابل فیلتر)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_requests_dto_1.QueryRequestsDto]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'ایجاد درخواست جدید' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'درخواست ایجاد شد' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'نیاز به ورود' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_request_dto_1.CreateRequestDto]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'درخواست‌های من (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'نیاز به ورود' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_requests_dto_1.QueryRequestsDto]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "getMyRequests", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'آمار کلی درخواست‌ها (عمومی)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'جزئیات درخواست (عمومی)' }),
    (0, swagger_1.ApiHeader)({ name: 'x-session-id', required: false, description: 'شناسه سشن برای محدودیت بازدید' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'جزئیات درخواست' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'درخواست یافت نشد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-session-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'ویرایش درخواست (صاحب یا مدیر)' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'نیاز به ورود' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'دسترسی غیرمجاز' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'درخواست یافت نشد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_request_dto_1.UpdateRequestDto]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'حذف درخواست (صاحب یا مدیر - حذف نرم)' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'نیاز به ورود' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'دسترسی غیرمجاز' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'درخواست یافت نشد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "remove", null);
exports.RequestsController = RequestsController = __decorate([
    (0, swagger_1.ApiTags)('Requests'),
    (0, common_1.Controller)('requests'),
    __metadata("design:paramtypes", [requests_service_1.RequestsService])
], RequestsController);
//# sourceMappingURL=requests.controller.js.map