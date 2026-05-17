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
exports.ToggleBookmarkDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ToggleBookmarkDto {
}
exports.ToggleBookmarkDto = ToggleBookmarkDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'نوع هدف',
        enum: ['REQUEST', 'SPECIALIST'],
        example: 'REQUEST',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'نوع bookmark الزامی است' }),
    (0, class_validator_1.IsIn)(['REQUEST', 'SPECIALIST'], { message: 'نوع باید REQUEST یا SPECIALIST باشد' }),
    __metadata("design:type", String)
], ToggleBookmarkDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'شناسه هدف', example: 'clxxxx' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'شناسه هدف الزامی است' }),
    __metadata("design:type", String)
], ToggleBookmarkDto.prototype, "targetId", void 0);
//# sourceMappingURL=toggle-bookmark.dto.js.map