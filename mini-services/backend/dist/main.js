"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const core_2 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const redis_cache_interceptor_1 = require("./common/interceptors/redis-cache.interceptor");
const cookie_parser_1 = require("cookie-parser");
process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    if (msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET') || msg.includes('Connection is closed')) {
        return;
    }
});
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: {
            origin: ['http://localhost:3000', '*'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        },
    });
    const io = app.getHttpAdapter()?.getInstance?.();
    if (io) {
        logger.log('✅ WebSocket CORS configured');
    }
    app.setGlobalPrefix('api', {
        exclude: ['health'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const reflector = app.get(core_2.Reflector);
    app.useGlobalInterceptors(new common_1.ClassSerializerInterceptor(reflector), new transform_interceptor_1.TransformInterceptor(), new redis_cache_interceptor_1.RedisCacheInterceptor(reflector, app.get('RedisService', { strict: false })));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    app.use((0, cookie_parser_1.default)());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('NeedFinder API')
        .setDescription('NeedFinder Platform API - Smart Needs & Specialists Platform\n\n' +
        '## Features\n' +
        '- JWT Authentication\n' +
        '- Users & Specialists Management\n' +
        '- Request & Proposal System\n' +
        '- Wallet & Transactions\n' +
        '- Real-time Chat (WebSocket)\n' +
        '- Notifications System\n' +
        '- Reviews & Ratings\n' +
        '- Advanced Search\n' +
        '- Admin Dashboard\n' +
        '- Referral System\n' +
        '- Bookmarks\n' +
        '- Events & Reporting')
        .setVersion('2.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT' }, 'bearer-auth')
        .addCookieAuth('refresh-token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh-token',
    })
        .addTag('Health', 'System Health')
        .addTag('Auth', 'Authentication')
        .addTag('Users', 'Users')
        .addTag('Categories', 'Categories')
        .addTag('Requests', 'Requests')
        .addTag('Proposals', 'Proposals')
        .addTag('Specialists', 'Specialists')
        .addTag('Reviews', 'Reviews & Ratings')
        .addTag('Wallet', 'Wallet')
        .addTag('Chat', 'Messaging')
        .addTag('Notifications', 'Notifications')
        .addTag('Reports', 'Reports')
        .addTag('Referrals', 'Referral System')
        .addTag('Admin', 'Admin Panel')
        .addTag('Search', 'Search')
        .addTag('Bookmarks', 'Bookmarks')
        .addTag('Events', 'Events')
        .addTag('Dashboard', 'Dashboard')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'method',
        },
        customSiteTitle: 'NeedFinder API Documentation',
    });
    const gracefulShutdown = async (signal) => {
        logger.log(`\n${signal} received — shutting down gracefully...`);
        try {
            await app.close();
            logger.log('✅ Application closed successfully');
            process.exit(0);
        }
        catch (err) {
            logger.error('❌ Error during shutdown:', err);
            process.exit(1);
        }
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught Exception:', err);
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    const PORT = process.env.PORT || 4000;
    await app.listen(PORT);
    logger.log('═══════════════════════════════════════════');
    logger.log('🚀 NeedFinder API v2.0 running');
    logger.log(`📡 HTTP:          http://localhost:${PORT}`);
    logger.log(`📖 Swagger:       http://localhost:${PORT}/api/docs`);
    logger.log(`🔌 WS Chat:       ws://localhost:${PORT}/chat`);
    logger.log(`🔌 WS Notifs:     ws://localhost:${PORT}/notifications`);
    logger.log(`🏥 Health:        http://localhost:${PORT}/health`);
    logger.log('═══════════════════════════════════════════');
    logger.log('📦 Loaded Modules:');
    logger.log('   ✅ Auth            ✅ Users           ✅ Categories');
    logger.log('   ✅ Requests        ✅ Proposals       ✅ Specialists');
    logger.log('   ✅ Reviews         ✅ Wallet          ✅ Chat');
    logger.log('   ✅ Notifications   ✅ Reports         ✅ Referrals');
    logger.log('   ✅ Admin           ✅ Search          ✅ Dashboard');
    logger.log('   ✅ Bookmarks       ✅ Events          ✅ Health');
    logger.log('   ✅ Redis           ✅ BullMQ (4 queues)');
    logger.log('   ✅ Rate Limiting   ✅ Cache Interceptor');
    logger.log('═══════════════════════════════════════════');
}
bootstrap().catch((err) => {
    console.error('Failed to start application:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map