"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseUuidPipe = void 0;
const common_1 = require("@nestjs/common");
let ParseUuidPipe = class ParseUuidPipe {
    transform(value) {
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (!value || !uuidRegex.test(value)) {
            throw new common_1.BadRequestException(`شناسه وارد شده معتبر نیست: ${value || '(خالی)'}`);
        }
        return value;
    }
};
exports.ParseUuidPipe = ParseUuidPipe;
exports.ParseUuidPipe = ParseUuidPipe = __decorate([
    (0, common_1.Injectable)()
], ParseUuidPipe);
//# sourceMappingURL=parse-uuid.pipe.js.map