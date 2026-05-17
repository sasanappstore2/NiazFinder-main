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
exports.RegisterDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نام', example: 'علی' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'نام الزامی است' }),
    (0, class_validator_1.MinLength)(2, { message: 'نام باید حداقل ۲ کاراکتر باشد' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نام خانوادگی', example: 'محمدی' }),
    (0, class_validator_1.MinLength)(2, { message: 'نام خانوادگی باید حداقل ۲ کاراکتر باشد' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ایمیل کاربر', example: 'user@example.com' }),
    (0, class_validator_1.IsEmail)({}, { message: 'فرمت ایمیل نامعتبر است' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'ایمیل الزامی است' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'رمز عبور (حداقل ۸ کاراکتر، یک حرف بزرگ، یک عدد)',
        example: 'Password123',
        minLength: 8,
        maxLength: 128,
    }),
    (0, class_validator_1.MinLength)(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' }),
    (0, class_validator_1.MaxLength)(128, { message: 'رمز عبور نمی‌تواند بیشتر از ۱۲۸ کاراکتر باشد' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'رمز عبور الزامی است' }),
    (0, class_validator_1.Matches)(/^(?=.*[A-Z])(?=.*\d)/, {
        message: 'رمز عبور باید حداقل یک حرف بزرگ انگلیسی و یک عدد داشته باشد',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'شماره موبایل',
        example: '09123456789',
        pattern: '^09[0-9]{9}$',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^09[0-9]{9}$/, { message: 'شماره موبایل نامعتبر است. فرمت صحیح: 09xxxxxxxxx' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'نقش کاربر',
        enum: ['CLIENT', 'SPECIALIST'],
        default: 'CLIENT',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['CLIENT', 'SPECIALIST'], { message: 'نقش باید CLIENT یا SPECIALIST باشد' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "role", void 0);
//# sourceMappingURL=register.dto.js.map