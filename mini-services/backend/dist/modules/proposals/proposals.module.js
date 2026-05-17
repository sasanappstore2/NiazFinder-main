"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const proposal_entity_1 = require("../../entities/proposal.entity");
const request_entity_1 = require("../../entities/request.entity");
const user_entity_1 = require("../../entities/user.entity");
const review_entity_1 = require("../../entities/review.entity");
const notification_entity_1 = require("../../entities/notification.entity");
const proposals_controller_1 = require("./proposals.controller");
const proposals_service_1 = require("./proposals.service");
let ProposalsModule = class ProposalsModule {
};
exports.ProposalsModule = ProposalsModule;
exports.ProposalsModule = ProposalsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([proposal_entity_1.Proposal, request_entity_1.Request, user_entity_1.User, review_entity_1.Review, notification_entity_1.Notification])],
        controllers: [proposals_controller_1.ProposalsController],
        providers: [proposals_service_1.ProposalsService],
        exports: [proposals_service_1.ProposalsService],
    })
], ProposalsModule);
//# sourceMappingURL=proposals.module.js.map