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
exports.BookmarksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bookmarks_service_1 = require("./bookmarks.service");
const toggle_bookmark_dto_1 = require("./dto/toggle-bookmark.dto");
const query_bookmarks_dto_1 = require("./dto/query-bookmarks.dto");
const jwt_auth_guard_1 = require("@/common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("@/common/decorators/current-user.decorator");
let BookmarksController = class BookmarksController {
    constructor(bookmarksService) {
        this.bookmarksService = bookmarksService;
    }
    async getUserBookmarks(user, query) {
        return this.bookmarksService.getUserBookmarks(user.id, query);
    }
    async toggleBookmark(user, dto) {
        return this.bookmarksService.toggleBookmark(user.id, dto);
    }
    async checkBookmark(user, type, targetId) {
        return this.bookmarksService.isBookmarked(user.id, type, targetId);
    }
    async removeBookmark(user, type, targetId) {
        return this.bookmarksService.removeBookmark(user.id, type, targetId);
    }
};
exports.BookmarksController = BookmarksController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'لیست علاقه‌مندی‌های کاربر' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'لیست علاقه‌مندی‌ها' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'احراز هویت ناموفق' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_bookmarks_dto_1.QueryBookmarksDto]),
    __metadata("design:returntype", Promise)
], BookmarksController.prototype, "getUserBookmarks", null);
__decorate([
    (0, common_1.Post)('toggle'),
    (0, swagger_1.ApiOperation)({ summary: 'افزودن/حذف علاقه‌مندی' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'عملیات علاقه‌مندی انجام شد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, toggle_bookmark_dto_1.ToggleBookmarkDto]),
    __metadata("design:returntype", Promise)
], BookmarksController.prototype, "toggleBookmark", null);
__decorate([
    (0, common_1.Get)('check/:type/:targetId'),
    (0, swagger_1.ApiOperation)({ summary: 'بررسی وضعیت علاقه‌مندی' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'وضعیت علاقه‌مندی' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('targetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BookmarksController.prototype, "checkBookmark", null);
__decorate([
    (0, common_1.Delete)(':type/:targetId'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف علاقه‌مندی' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'علاقه‌مندی حذف شد' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'علاقه‌مندی یافت نشد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('targetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BookmarksController.prototype, "removeBookmark", null);
exports.BookmarksController = BookmarksController = __decorate([
    (0, swagger_1.ApiTags)('Bookmarks'),
    (0, common_1.Controller)('bookmarks'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [bookmarks_service_1.BookmarksService])
], BookmarksController);
//# sourceMappingURL=bookmarks.controller.js.map