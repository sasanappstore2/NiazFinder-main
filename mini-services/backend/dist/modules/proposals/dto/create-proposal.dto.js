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
exports.CreateProposalDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateProposalDto {
}
exports.CreateProposalDto = CreateProposalDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'شناسه درخواست' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'شناسه درخواست الزامی است' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProposalDto.prototype, "requestId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'نامه پوششی (توضیح پیشنهاد)',
        example: 'با تجربه بیش از ۵ سال در طراحی وب، می‌توانم پروژه شما را با کیفیت بالا تحویل دهم.',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'نامه پوششی الزامی است' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20, { message: 'نامه پوششی باید حداقل ۲۰ کاراکتر باشد' }),
    (0, class_validator_1.MaxLength)(3000, { message: 'نامه پوششی نباید بیشتر از ۳۰۰۰ کاراکتر باشد' }),
    __metadata("design:type", String)
], CreateProposalDto.prototype, "coverLetter", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'بودجه پیشنهادی (تومان)', example: 5000000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: 'بودجه نمی‌تواند منفی باشد' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateProposalDto.prototype, "estimatedBudget", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'زمان تحویل تخمینی' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: 'زمان تحویل باید حداقل ۱ باشد' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateProposalDto.prototype, "estimatedTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'واحد زمان تحویل', enum: ['day', 'hour', 'month'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['day', 'hour', 'month'], { message: 'واحد زمان تحویل نامعتبر است' }),
    __metadata("design:type", String)
], CreateProposalDto.prototype, "deliveryUnit", void 0);
//# sourceMappingURL=create-proposal.dto.js.map