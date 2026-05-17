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
exports.Request = exports.RequestStatus = exports.RequestPriority = exports.DeliveryUnit = exports.BudgetType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
var BudgetType;
(function (BudgetType) {
    BudgetType["FIXED"] = "FIXED";
    BudgetType["HOURLY"] = "HOURLY";
    BudgetType["NEGOTIABLE"] = "NEGOTIABLE";
})(BudgetType || (exports.BudgetType = BudgetType = {}));
var DeliveryUnit;
(function (DeliveryUnit) {
    DeliveryUnit["DAY"] = "day";
    DeliveryUnit["HOUR"] = "hour";
    DeliveryUnit["MONTH"] = "month";
})(DeliveryUnit || (exports.DeliveryUnit = DeliveryUnit = {}));
var RequestPriority;
(function (RequestPriority) {
    RequestPriority["LOW"] = "LOW";
    RequestPriority["NORMAL"] = "NORMAL";
    RequestPriority["HIGH"] = "HIGH";
    RequestPriority["URGENT"] = "URGENT";
})(RequestPriority || (exports.RequestPriority = RequestPriority = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["OPEN"] = "OPEN";
    RequestStatus["IN_PROGRESS"] = "IN_PROGRESS";
    RequestStatus["COMPLETED"] = "COMPLETED";
    RequestStatus["CANCELLED"] = "CANCELLED";
    RequestStatus["EXPIRED"] = "EXPIRED";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
let Request = class Request extends base_entity_1.BaseEntity {
};
exports.Request = Request;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 300 }),
    __metadata("design:type", String)
], Request.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 350, unique: true }),
    __metadata("design:type", String)
], Request.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Request.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], Request.prototype, "budgetMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], Request.prototype, "budgetMax", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BudgetType,
        default: BudgetType.FIXED,
    }),
    __metadata("design:type", String)
], Request.prototype, "budgetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Request.prototype, "deliveryTime", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DeliveryUnit,
        default: DeliveryUnit.DAY,
    }),
    __metadata("design:type", String)
], Request.prototype, "deliveryUnit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Request.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Request.prototype, "province", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RequestPriority,
        default: RequestPriority.NORMAL,
    }),
    __metadata("design:type", String)
], Request.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RequestStatus,
        default: RequestStatus.OPEN,
    }),
    __metadata("design:type", String)
], Request.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Request.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Request.prototype, "viewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Request.prototype, "proposalCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Request.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Request.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => require('./category.entity').Category, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'category_id' }),
    __metadata("design:type", Object)
], Request.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Request.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => require('./user.entity').User, (user) => user.requests, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", Object)
], Request.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Request.prototype, "selectedProposalId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => require('./proposal.entity').Proposal, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'selected_proposal_id' }),
    __metadata("design:type", Object)
], Request.prototype, "selectedProposal", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => require('./proposal.entity').Proposal, (proposal) => proposal.request),
    __metadata("design:type", Array)
], Request.prototype, "proposals", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => require('./review.entity').Review, (review) => review.request),
    __metadata("design:type", Array)
], Request.prototype, "reviews", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => require('./conversation.entity').Conversation, (conversation) => conversation.request),
    __metadata("design:type", Array)
], Request.prototype, "conversations", void 0);
exports.Request = Request = __decorate([
    (0, typeorm_1.Entity)('requests'),
    (0, typeorm_1.Index)(['slug'], { unique: true }),
    (0, typeorm_1.Index)(['city']),
    (0, typeorm_1.Index)(['province']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['priority']),
    (0, typeorm_1.Index)(['categoryId']),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['createdAt'])
], Request);
//# sourceMappingURL=request.entity.js.map