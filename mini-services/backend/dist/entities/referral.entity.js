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
exports.Referral = exports.ReferralStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
var ReferralStatus;
(function (ReferralStatus) {
    ReferralStatus["PENDING"] = "PENDING";
    ReferralStatus["COMPLETED"] = "COMPLETED";
})(ReferralStatus || (exports.ReferralStatus = ReferralStatus = {}));
let Referral = class Referral extends base_entity_1.BaseEntity {
};
exports.Referral = Referral;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Referral.prototype, "referrerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => require('./user.entity').User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'referrer_id' }),
    __metadata("design:type", Object)
], Referral.prototype, "referrer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', unique: true }),
    __metadata("design:type", String)
], Referral.prototype, "referredId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => require('./user.entity').User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'referred_id' }),
    __metadata("design:type", Object)
], Referral.prototype, "referred", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Referral.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ReferralStatus,
        default: ReferralStatus.PENDING,
    }),
    __metadata("design:type", String)
], Referral.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Referral.prototype, "reward", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Referral.prototype, "rewardPaid", void 0);
exports.Referral = Referral = __decorate([
    (0, typeorm_1.Entity)('referrals'),
    (0, typeorm_1.Index)(['referrerId']),
    (0, typeorm_1.Index)(['code'])
], Referral);
//# sourceMappingURL=referral.entity.js.map