import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { RequestsModule } from './modules/requests/requests.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { SpecialistsModule } from './modules/specialists/specialists.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ChatModule } from './modules/chat/chat.module';
import { VoiceModule } from './modules/voice/voice.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { AdminModule } from './modules/admin/admin.module';
import { SearchModule } from './modules/search/search.module';
import { EventsModule } from './modules/events/events.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { IntakeTypingModule } from './modules/intake-typing/intake-typing.module';
import { IntakeQueueModule } from './modules/intake-queue/intake-queue.module';
import { IntakeIntelligenceModule } from './modules/intake-intelligence/intake-intelligence.module';
import { InternalModule } from './modules/internal/internal.module';
import { IntentParserModule } from './intent-parser/intent-parser.module';
import { SmartMatchingModule } from './modules/smart-matching/smart-matching.module';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RedisModule } from './common/redis/redis.module';
import { RedisService } from './common/redis/redis.service';
import { NotificationProcessor } from './common/processors/notifications.processor';
import { EmailProcessor } from './common/processors/email.processor';
import { CleanupProcessor } from './common/processors/cleanup.processor';
import { AnalyticsProcessor } from './common/processors/analytics.processor';
import { RequestModerationProcessor } from './common/processors/request-moderation.processor';
import { BullMQConfigModule } from './config/bullmq.config';
import { DatabaseModule } from './config/database.module';
import { OllamaHttpModule } from './common/http/ollama-http.module';

// ─── Entities (TypeORM) ───
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { Request } from './entities/request.entity';
import { Proposal } from './entities/proposal.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Notification } from './entities/notification.entity';
import { Review } from './entities/review.entity';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { Bookmark } from './entities/bookmark.entity';
import { Report } from './entities/report.entity';
import { Referral } from './entities/referral.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Otp } from './entities/otp.entity';
import { Skill } from './entities/skill.entity';
import { UserSkill } from './entities/user-skill.entity';
import { Portfolio } from './entities/portfolio.entity';

const entities = [
  User, Category, Request, Proposal, Conversation, Message,
  Notification, Review, Wallet, Transaction, Bookmark,
  Report, Referral, AuditLog, Otp, Skill, UserSkill, Portfolio,
];

@Module({
  imports: [
    // ─── Configuration ───
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development'],
    }),

    // ─── Database (TypeORM + PostgreSQL, fallback to SQLite) ───
    DatabaseModule.forRoot(entities),

    // ─── Prisma (backward compatibility) ───
    PrismaModule,

    // ─── Redis ───
    RedisModule.forRoot(),

    // ─── Ollama HTTP (keep-alive pool, parallel inference client) ───
    OllamaHttpModule,

    // ─── BullMQ Queues ───
    BullMQConfigModule.forRoot(),
    BullMQConfigModule.registerQueues(),

    // ─── JWT ───
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'needfinder-jwt-secret-2024-production-key',
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '30d' },
      }),
    }),

    // ─── Rate Limiting ───
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },       // 100 req/min globally
      { ttl: 60000, limit: 20, name: 'short' },  // 20 req/min for sensitive endpoints
    ]),

    // ─── Feature Modules ───
    AuthModule,
    UsersModule,
    CategoriesModule,
    RequestsModule,
    ProposalsModule,
    SpecialistsModule,
    ReviewsModule,
    WalletModule,
    ChatModule,
    VoiceModule,
    NotificationsModule,
    ReportsModule,
    ReferralsModule,
    AdminModule,
    SearchModule,
    EventsModule,
    BookmarksModule,
    DashboardModule,
    HealthModule,
    IntakeTypingModule,
    IntakeQueueModule,
    IntakeIntelligenceModule,
    InternalModule,
    IntentParserModule,
    SmartMatchingModule,
  ],
  providers: [
    // ─── WebSocket Gateways (ChatGateway is provided by ChatModule) ───
    NotificationsGateway,

    // ─── Global Filters & Interceptors ───
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },

    // ─── BullMQ Processors ───
    NotificationProcessor,
    EmailProcessor,
    CleanupProcessor,
    AnalyticsProcessor,
    RequestModerationProcessor,

    // ─── Redis Service (for global access) ───
    RedisService,
  ],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor() {
    this.logger.log('═══════════════════════════════════════════');
    this.logger.log('🚀 NeedFinder AppModule initialized');
    this.logger.log('📦 Modules: Auth, Users, Categories, Requests, Proposals,');
    this.logger.log('   Specialists, Reviews, Wallet, Chat, Notifications,');
    this.logger.log('   Reports, Referrals, Admin, Search, Events, Bookmarks,');
    this.logger.log('   Dashboard, Health');
    this.logger.log('🔧 Infra: Redis, BullMQ, TypeORM, Prisma, JWT, Throttler');
    this.logger.log('═══════════════════════════════════════════');
  }
}
