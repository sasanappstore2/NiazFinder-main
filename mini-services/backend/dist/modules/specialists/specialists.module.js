"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialistsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../../entities/user.entity");
const portfolio_entity_1 = require("../../entities/portfolio.entity");
const review_entity_1 = require("../../entities/review.entity");
const proposal_entity_1 = require("../../entities/proposal.entity");
const skill_entity_1 = require("../../entities/skill.entity");
const user_skill_entity_1 = require("../../entities/user-skill.entity");
const specialists_service_1 = require("./specialists.service");
const specialists_controller_1 = require("./specialists.controller");
let SpecialistsModule = class SpecialistsModule {
};
exports.SpecialistsModule = SpecialistsModule;
exports.SpecialistsModule = SpecialistsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, portfolio_entity_1.Portfolio, review_entity_1.Review, proposal_entity_1.Proposal, skill_entity_1.Skill, user_skill_entity_1.UserSkill])],
        controllers: [specialists_controller_1.SpecialistsController],
        providers: [specialists_service_1.SpecialistsService],
        exports: [specialists_service_1.SpecialistsService],
    })
], SpecialistsModule);
//# sourceMappingURL=specialists.module.js.map