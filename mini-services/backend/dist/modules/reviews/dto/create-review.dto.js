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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateReviewDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateReviewDto {
}
exports.CreateReviewDto = CreateReviewDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'شناسه کاربری مورد نظر برای بررسی' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'شناسه کاربری الزامی است' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "targetUserId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'شناسه پیشنهاد' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'شناسه پیشنهاد الزامی است' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "proposalId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'شناسه درخواست خدمت' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'شناسه درخواست الزامی است' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "requestId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'امتیاز کلی (۱ تا ۵)', minimum: 1, maximum: 5 }),
    (0, class_validator_1.IsInt)({ message: 'امتیاز باید عدد صحیح باشد' }),
    (0, class_validator_1.Min)(1, { message: 'حداقل امتیاز ۱ است' }),
    (0, class_validator_1.Max)(5, { message: 'حداکثر امتیاز ۵ است' }),
    __metadata("design:type", Number)
], CreateReviewDto.prototype, "rating", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'متن نظر',
        minLength: 10,
        maxLength: 2000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MinLength)(10, { message: 'نظر باید حداقل ۱۰ کاراکتر باشد' }),
    (0, class_validator_1.MaxLength)(2000, { message: 'نظر نمی‌تواند بیشتر از ۲۰۰۰ کاراکتر باشد' }),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "comment", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'امتیاز کیفیت کار (۱ تا ۵)', minimum: 1, maximum: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'امتیاز کیفیت باید عدد صحیح باشد' }),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreateReviewDto.prototype, "qualityRating", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'امتیاز زمان‌بندی (۱ تا ۵)', minimum: 1, maximum: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'امتیاز زمان‌بندی باید عدد صحیح باشد' }),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreateReviewDto.prototype, "timingRating", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'امتیاز ارتباط و مکاتبه (۱ تا ۵)', minimum: 1, maximum: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'امتیاز ارتباط باید عدد صحیح باشد' }),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreateReviewDto.prototype, "communicationRating", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'امتیاز حرفه‌ای بودن (۱ تا ۵)', minimum: 1, maximum: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'امتیاز حرفه‌ای بودن باید عدد صحیح باشد' }),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreateReviewDto.prototype, "professionalismRating", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نقاط قوت', maxLength: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500, { message: 'نقاط قوت نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد' }),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "pros", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نقاط ضعف', maxLength: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500, { message: 'نقاط ضعف نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد' }),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "cons", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'آیا کاربر را پیشنهاد می‌کنید؟' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: 'مقدار باید بولی باشد' }),
    __metadata("design:type", Boolean)
], CreateReviewDto.prototype, "isRecommended", void 0);
//# sourceMappingURL=create-review.dto.js.map