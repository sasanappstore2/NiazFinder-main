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
exports.Proposal = exports.ProposalStatus = exports.ProposalDeliveryUnit = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
var ProposalDeliveryUnit;
(function (ProposalDeliveryUnit) {
    ProposalDeliveryUnit["DAY"] = "day";
    ProposalDeliveryUnit["HOUR"] = "hour";
    ProposalDeliveryUnit["MONTH"] = "month";
})(ProposalDeliveryUnit || (exports.ProposalDeliveryUnit = ProposalDeliveryUnit = {}));
var ProposalStatus;
(function (ProposalStatus) {
    ProposalStatus["PENDING"] = "PENDING";
    ProposalStatus["ACCEPTED"] = "ACCEPTED";
    ProposalStatus["REJECTED"] = "REJECTED";
    ProposalStatus["WITHDRAWN"] = "WITHDRAWN";
})(ProposalStatus || (exports.ProposalStatus = ProposalStatus = {}));
let Proposal = class Proposal extends base_entity_1.BaseEntity {
};
exports.Proposal = Proposal;
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Proposal.prototype, "coverLetter", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], Proposal.prototype, "estimatedBudget", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Proposal.prototype, "estimatedTime", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ProposalDeliveryUnit,
        default: ProposalDeliveryUnit.DAY,
    }),
    __metadata("design:type", String)
], Proposal.prototype, "deliveryUnit", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ProposalStatus,
        default: ProposalStatus.PENDING,
    }),
    __metadata("design:type", String)
], Proposal.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Proposal.prototype, "requestId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => require('./request.entity').Request, (request) => request.proposals, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'request_id' }),
    __metadata("design:type", Object)
], Proposal.prototype, "request", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Proposal.prototype, "specialistId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => require('./user.entity').User, (user) => user.proposals, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'specialist_id' }),
    __metadata("design:type", Object)
], Proposal.prototype, "specialist", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => require('./review.entity').Review, (review) => review.proposal, { nullable: true }),
    __metadata("design:type", Object)
], Proposal.prototype, "review", void 0);
exports.Proposal = Proposal = __decorate([
    (0, typeorm_1.Entity)('proposals'),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['requestId']),
    (0, typeorm_1.Index)(['specialistId'])
], Proposal);
//# sourceMappingURL=proposal.entity.js.map