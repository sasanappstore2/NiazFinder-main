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
exports.ResetPasswordDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ResetPasswordDto {
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'توکن بازنشانی رمز عبور' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'توکن الزامی است' }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'رمز عبور جدید',
        minLength: 8,
        maxLength: 128,
        example: 'Password123',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'رمز عبور جدید الزامی است' }),
    (0, class_validator_1.MinLength)(8, { message: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد' }),
    (0, class_validator_1.MaxLength)(128, { message: 'رمز عبور جدید نمی‌تواند بیشتر از ۱۲۸ کاراکتر باشد' }),
    (0, class_validator_1.Matches)(/^(?=.*[A-Z])(?=.*\d)/, {
        message: 'رمز عبور باید حداقل یک حرف بزرگ انگلیسی و یک عدد داشته باشد',
    }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "newPassword", void 0);
//# sourceMappingURL=reset-password.dto.js.map