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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const search_service_1 = require("./search.service");
let SearchController = class SearchController {
    constructor(searchService) {
        this.searchService = searchService;
    }
    async search(q, type, city, province, categoryId, minBudget, maxBudget, minRating, sort, page, limit) {
        if (!q || !q.trim()) {
            return {
                query: '',
                type: type || 'all',
                results: {
                    requests: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
                    specialists: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
                },
            };
        }
        const params = {
            query: q,
            type: type || 'all',
            city,
            province,
            categoryId,
            minBudget: minBudget ? Number(minBudget) : undefined,
            maxBudget: maxBudget ? Number(maxBudget) : undefined,
            minRating: minRating ? Number(minRating) : undefined,
            sort: sort || 'relevance',
            page: page ? Number(page) : 1,
            limit: limit ? Math.min(Number(limit), 50) : 10,
        };
        return this.searchService.search(params);
    }
    async getSuggestions(q) {
        return this.searchService.getSuggestions(q);
    }
    async getPopularSearches() {
        return this.searchService.getPopularSearches();
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'جستجوی کلی در پلتفرم (عمومی)' }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, description: 'عبارت جستجو' }),
    (0, swagger_1.ApiQuery)({
        name: 'type',
        required: false,
        description: 'نوع جستجو',
        enum: ['all', 'requests', 'specialists'],
    }),
    (0, swagger_1.ApiQuery)({ name: 'city', required: false, description: 'فیلتر شهر' }),
    (0, swagger_1.ApiQuery)({ name: 'province', required: false, description: 'فیلتر استان' }),
    (0, swagger_1.ApiQuery)({ name: 'categoryId', required: false, description: 'فیلتر دسته‌بندی' }),
    (0, swagger_1.ApiQuery)({ name: 'minBudget', required: false, description: 'حداقل بودجه' }),
    (0, swagger_1.ApiQuery)({ name: 'maxBudget', required: false, description: 'حداکثر بودجه' }),
    (0, swagger_1.ApiQuery)({ name: 'minRating', required: false, description: 'حداقل امتیاز' }),
    (0, swagger_1.ApiQuery)({
        name: 'sort',
        required: false,
        description: 'مرتب‌سازی',
        enum: ['relevance', 'newest', 'price_low', 'price_high', 'rating'],
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'شماره صفحه' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'تعداد نتایج' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('city')),
    __param(3, (0, common_1.Query)('province')),
    __param(4, (0, common_1.Query)('categoryId')),
    __param(5, (0, common_1.Query)('minBudget')),
    __param(6, (0, common_1.Query)('maxBudget')),
    __param(7, (0, common_1.Query)('minRating')),
    __param(8, (0, common_1.Query)('sort')),
    __param(9, (0, common_1.Query)('page')),
    __param(10, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('suggestions'),
    (0, swagger_1.ApiOperation)({ summary: 'پیشنهادهای خودکار جستجو (عمومی)' }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, description: 'عبارت جستجو' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "getSuggestions", null);
__decorate([
    (0, common_1.Get)('popular'),
    (0, swagger_1.ApiOperation)({ summary: 'جستجوهای محبوب (عمومی)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "getPopularSearches", null);
exports.SearchController = SearchController = __decorate([
    (0, swagger_1.ApiTags)('Search'),
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
//# sourceMappingURL=search.controller.js.map