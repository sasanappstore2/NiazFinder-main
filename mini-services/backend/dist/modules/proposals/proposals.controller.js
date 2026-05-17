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
exports.ProposalsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const proposals_service_1 = require("./proposals.service");
const create_proposal_dto_1 = require("./dto/create-proposal.dto");
const update_proposal_status_dto_1 = require("./dto/update-proposal-status.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let ProposalsController = class ProposalsController {
    constructor(proposalsService) {
        this.proposalsService = proposalsService;
    }
    async create(userId, dto) {
        return this.proposalsService.create(userId, dto);
    }
    async findByRequest(requestId) {
        return this.proposalsService.findByRequest(requestId);
    }
    async getMyProposals(userId) {
        return this.proposalsService.findBySpecialist(userId);
    }
    async updateStatus(id, userId, dto) {
        return this.proposalsService.updateStatus(id, userId, dto);
    }
    async withdraw(id, userId) {
        return this.proposalsService.withdraw(id, userId);
    }
};
exports.ProposalsController = ProposalsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'ارسال پیشنهاد جدید (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'پیشنهاد ایجاد شد' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'نیاز به ورود' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'درخواست بسته است یا قبلاً پیشنهاد ارسال شده' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_proposal_dto_1.CreateProposalDto]),
    __metadata("design:returntype", Promise)
], ProposalsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('request/:requestId'),
    (0, swagger_1.ApiOperation)({ summary: 'پیشنهادهای یک درخواست (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'لیست پیشنهادها' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'درخواست یافت نشد' }),
    __param(0, (0, common_1.Param)('requestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProposalsController.prototype, "findByRequest", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'پیشنهادهای من (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'نیاز به ورود' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProposalsController.prototype, "getMyProposals", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'تغییر وضعیت پیشنهاد (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'وضعیت تغییر کرد' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'نیاز به ورود' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'دسترسی غیرمجاز' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_proposal_status_dto_1.UpdateProposalStatusDto]),
    __metadata("design:returntype", Promise)
], ProposalsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'پس‌گرفتن پیشنهاد (محافظت شده)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'پیشنهاد پس گرفته شد' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'نیاز به ورود' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'دسترسی غیرمجاز' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProposalsController.prototype, "withdraw", null);
exports.ProposalsController = ProposalsController = __decorate([
    (0, swagger_1.ApiTags)('Proposals'),
    (0, common_1.Controller)('proposals'),
    __metadata("design:paramtypes", [proposals_service_1.ProposalsService])
], ProposalsController);
//# sourceMappingURL=proposals.controller.js.map