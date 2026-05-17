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
var AppModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const categories_module_1 = require("./modules/categories/categories.module");
const requests_module_1 = require("./modules/requests/requests.module");
const proposals_module_1 = require("./modules/proposals/proposals.module");
const specialists_module_1 = require("./modules/specialists/specialists.module");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const chat_module_1 = require("./modules/chat/chat.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const reports_module_1 = require("./modules/reports/reports.module");
const referrals_module_1 = require("./modules/referrals/referrals.module");
const admin_module_1 = require("./modules/admin/admin.module");
const search_module_1 = require("./modules/search/search.module");
const events_module_1 = require("./modules/events/events.module");
const bookmarks_module_1 = require("./modules/bookmarks/bookmarks.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const health_module_1 = require("./modules/health/health.module");
const chat_gateway_1 = require("./gateways/chat.gateway");
const notifications_gateway_1 = require("./gateways/notifications.gateway");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const redis_module_1 = require("./common/redis/redis.module");
const redis_service_1 = require("./common/redis/redis.service");
const notifications_processor_1 = require("./common/processors/notifications.processor");
const email_processor_1 = require("./common/processors/email.processor");
const cleanup_processor_1 = require("./common/processors/cleanup.processor");
const analytics_processor_1 = require("./common/processors/analytics.processor");
const bullmq_config_1 = require("./config/bullmq.config");
const database_module_1 = require("./config/database.module");
const user_entity_1 = require("./entities/user.entity");
const category_entity_1 = require("./entities/category.entity");
const request_entity_1 = require("./entities/request.entity");
const proposal_entity_1 = require("./entities/proposal.entity");
const conversation_entity_1 = require("./entities/conversation.entity");
const message_entity_1 = require("./entities/message.entity");
const notification_entity_1 = require("./entities/notification.entity");
const review_entity_1 = require("./entities/review.entity");
const wallet_entity_1 = require("./entities/wallet.entity");
const transaction_entity_1 = require("./entities/transaction.entity");
const bookmark_entity_1 = require("./entities/bookmark.entity");
const report_entity_1 = require("./entities/report.entity");
const referral_entity_1 = require("./entities/referral.entity");
const audit_log_entity_1 = require("./entities/audit-log.entity");
const otp_entity_1 = require("./entities/otp.entity");
const skill_entity_1 = require("./entities/skill.entity");
const user_skill_entity_1 = require("./entities/user-skill.entity");
const portfolio_entity_1 = require("./entities/portfolio.entity");
const entities = [
    user_entity_1.User, category_entity_1.Category, request_entity_1.Request, proposal_entity_1.Proposal, conversation_entity_1.Conversation, message_entity_1.Message,
    notification_entity_1.Notification, review_entity_1.Review, wallet_entity_1.Wallet, transaction_entity_1.Transaction, bookmark_entity_1.Bookmark,
    report_entity_1.Report, referral_entity_1.Referral, audit_log_entity_1.AuditLog, otp_entity_1.Otp, skill_entity_1.Skill, user_skill_entity_1.UserSkill, portfolio_entity_1.Portfolio,
];
let AppModule = AppModule_1 = class AppModule {
    constructor() {
        this.logger = new common_1.Logger(AppModule_1.name);
        this.logger.log('═══════════════════════════════════════════');
        this.logger.log('🚀 NeedFinder AppModule initialized');
        this.logger.log('📦 Modules: Auth, Users, Categories, Requests, Proposals,');
        this.logger.log('   Specialists, Reviews, Wallet, Chat, Notifications,');
        this.logger.log('   Reports, Referrals, Admin, Search, Events, Bookmarks,');
        this.logger.log('   Dashboard, Health');
        this.logger.log('🔧 Infra: Redis, BullMQ, TypeORM, Prisma, JWT, Throttler');
        this.logger.log('═══════════════════════════════════════════');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = AppModule_1 = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', '.env.local', '.env.development'],
            }),
            database_module_1.DatabaseModule.forRoot(entities),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule.forRoot(),
            bullmq_config_1.BullMQConfigModule.forRoot(),
            bullmq_config_1.BullMQConfigModule.registerQueues(),
            jwt_1.JwtModule.registerAsync({
                global: true,
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET') || 'needfinder-jwt-secret-2024-production-key',
                    signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '30d' },
                }),
            }),
            throttler_1.ThrottlerModule.forRoot([
                { ttl: 60000, limit: 100 },
                { ttl: 60000, limit: 20, name: 'short' },
            ]),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            categories_module_1.CategoriesModule,
            requests_module_1.RequestsModule,
            proposals_module_1.ProposalsModule,
            specialists_module_1.SpecialistsModule,
            reviews_module_1.ReviewsModule,
            wallet_module_1.WalletModule,
            chat_module_1.ChatModule,
            notifications_module_1.NotificationsModule,
            reports_module_1.ReportsModule,
            referrals_module_1.ReferralsModule,
            admin_module_1.AdminModule,
            search_module_1.SearchModule,
            events_module_1.EventsModule,
            bookmarks_module_1.BookmarksModule,
            dashboard_module_1.DashboardModule,
            health_module_1.HealthModule,
        ],
        providers: [
            chat_gateway_1.ChatGateway,
            notifications_gateway_1.NotificationsGateway,
            { provide: core_1.APP_FILTER, useClass: all_exceptions_filter_1.AllExceptionsFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: transform_interceptor_1.TransformInterceptor },
            notifications_processor_1.NotificationProcessor,
            email_processor_1.EmailProcessor,
            cleanup_processor_1.CleanupProcessor,
            analytics_processor_1.AnalyticsProcessor,
            redis_service_1.RedisService,
        ],
    }),
    __metadata("design:paramtypes", [])
], AppModule);
//# sourceMappingURL=app.module.js.map