"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../entities/user.entity");
const category_entity_1 = require("../entities/category.entity");
const request_entity_1 = require("../entities/request.entity");
const proposal_entity_1 = require("../entities/proposal.entity");
const portfolio_entity_1 = require("../entities/portfolio.entity");
const review_entity_1 = require("../entities/review.entity");
const skill_entity_1 = require("../entities/skill.entity");
const wallet_entity_1 = require("../entities/wallet.entity");
const transaction_entity_1 = require("../entities/transaction.entity");
const notification_entity_1 = require("../entities/notification.entity");
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.DATABASE_HOST || 'localhost',
                port: parseInt(process.env.DATABASE_PORT || '5432'),
                username: process.env.DATABASE_USER || 'needfinder',
                password: process.env.DATABASE_PASSWORD || 'needfinder123',
                database: process.env.DATABASE_NAME || 'needfinder',
                entities: [
                    user_entity_1.User,
                    category_entity_1.Category,
                    request_entity_1.Request,
                    proposal_entity_1.Proposal,
                    portfolio_entity_1.Portfolio,
                    review_entity_1.Review,
                    skill_entity_1.Skill,
                    wallet_entity_1.Wallet,
                    transaction_entity_1.Transaction,
                    notification_entity_1.Notification,
                ],
                synchronize: process.env.NODE_ENV === 'development',
                logging: process.env.NODE_ENV === 'development',
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            }),
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                category_entity_1.Category,
                request_entity_1.Request,
                proposal_entity_1.Proposal,
                portfolio_entity_1.Portfolio,
                review_entity_1.Review,
                skill_entity_1.Skill,
                wallet_entity_1.Wallet,
                transaction_entity_1.Transaction,
                notification_entity_1.Notification,
            ]),
        ],
        exports: [typeorm_1.TypeOrmModule],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map