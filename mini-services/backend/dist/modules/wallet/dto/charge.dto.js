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
exports.ChargeDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ChargeDto {
}
exports.ChargeDto = ChargeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'مبلغ شارژ (ریال)', minimum: 10000 }),
    (0, class_validator_1.IsInt)({ message: 'مبلغ باید عدد صحیح باشد' }),
    (0, class_validator_1.Min)(10000, { message: 'حداقل مبلغ شارژ ۱۰,۰۰۰ ریال است' }),
    __metadata("design:type", Number)
], ChargeDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'توضیحات', maxLength: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500, { message: 'توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد' }),
    __metadata("design:type", String)
], ChargeDto.prototype, "description", void 0);
//# sourceMappingURL=charge.dto.js.map