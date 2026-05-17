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
exports.CreateRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateRequestDto {
}
exports.CreateRequestDto = CreateRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'عنوان درخواست', example: 'طراحی وب‌سایت فروشگاهی' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'عنوان درخواست الزامی است' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5, { message: 'عنوان باید حداقل ۵ کاراکتر باشد' }),
    (0, class_validator_1.MaxLength)(200, { message: 'عنوان نباید بیشتر از ۲۰۰ کاراکتر باشد' }),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'توضیحات درخواست', example: 'نیاز به طراحی یک وب‌سایت فروشگاهی با قابلیت پرداخت آنلاین' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'توضیحات درخواست الزامی است' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20, { message: 'توضیحات باید حداقل ۲۰ کاراکتر باشد' }),
    (0, class_validator_1.MaxLength)(5000, { message: 'توضیحات نباید بیشتر از ۵۰۰۰ کاراکتر باشد' }),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'شناسه دسته‌بندی', example: 'clx123abc' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'دسته‌بندی الزامی است' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حداقل بودجه (تومان)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: 'حداقل بودجه نمی‌تواند منفی باشد' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRequestDto.prototype, "budgetMin", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حداکثر بودجه (تومان)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: 'حداکثر بودجه نمی‌تواند منفی باشد' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRequestDto.prototype, "budgetMax", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نوع بودجه', enum: ['FIXED', 'HOURLY', 'NEGOTIABLE'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['FIXED', 'HOURLY', 'NEGOTIABLE'], { message: 'نوع بودجه نامعتبر است' }),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "budgetType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'زمان تحویل' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: 'زمان تحویل باید حداقل ۱ باشد' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRequestDto.prototype, "deliveryTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'واحد زمان تحویل', enum: ['day', 'hour', 'month'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['day', 'hour', 'month'], { message: 'واحد زمان تحویل نامعتبر است' }),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "deliveryUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'شهر' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'استان' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "province", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'اولویت', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['LOW', 'NORMAL', 'HIGH', 'URGENT'], { message: 'اولویت نامعتبر است' }),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'برچسب‌ها', type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true, message: 'هر برچسب باید رشته باشد' }),
    (0, class_validator_1.MaxLength)(10, { each: true, message: 'حداکثر ۱۰ برچسب مجاز است' }),
    __metadata("design:type", Array)
], CreateRequestDto.prototype, "tags", void 0);
//# sourceMappingURL=create-request.dto.js.map