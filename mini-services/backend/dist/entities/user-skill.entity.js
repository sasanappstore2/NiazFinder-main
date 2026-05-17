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
exports.UserSkill = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
let UserSkill = class UserSkill extends base_entity_1.BaseEntity {
};
exports.UserSkill = UserSkill;
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    __metadata("design:type", String)
], UserSkill.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => require('./user.entity').User, { onDelete: 'CASCADE' }),
    __metadata("design:type", Object)
], UserSkill.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'skill_id', type: 'uuid' }),
    __metadata("design:type", String)
], UserSkill.prototype, "skillId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => require('./skill.entity').Skill, { onDelete: 'CASCADE' }),
    __metadata("design:type", Object)
], UserSkill.prototype, "skill", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], UserSkill.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], UserSkill.prototype, "experience", void 0);
exports.UserSkill = UserSkill = __decorate([
    (0, typeorm_1.Entity)('user_skills'),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['skillId']),
    (0, typeorm_1.Index)(['userId', 'skillId'], { unique: true })
], UserSkill);
//# sourceMappingURL=user-skill.entity.js.map