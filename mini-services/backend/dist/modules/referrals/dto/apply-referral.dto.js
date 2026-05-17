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
exports.ApplyReferralDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ApplyReferralDto {
}
exports.ApplyReferralDto = ApplyReferralDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'کد دعوت', example: 'NF-AB12CD' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'کد دعوت الزامی است' }),
    (0, class_validator_1.Matches)(/^NF-[A-Z0-9]{6}$/, {
        message: 'فرمت کد دعوت نامعتبر است. کد باید به فرمت NF-XXXXXX باشد',
    }),
    __metadata("design:type", String)
], ApplyReferralDto.prototype, "code", void 0);
//# sourceMappingURL=apply-referral.dto.js.map