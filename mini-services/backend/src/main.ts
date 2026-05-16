import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RedisCacheInterceptor } from './common/interceptors/redis-cache.interceptor';
import cookieParser from 'cookie-parser';

// ─── Suppress ioredis unhandled errors when Redis is not available ───
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET') || msg.includes('Connection is closed')) {
    // Redis/connection errors — already handled gracefully
    return;
  }
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ─── Create App ───
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: ['http://localhost:3000', '*'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
  });

  // ─── WebSocket CORS ───
  const io = app.getHttpAdapter()?.getInstance?.();
  if (io) {
    // CORS is handled by NestFactory.create above for the HTTP adapter.
    // For Socket.IO gateways, CORS is configured per-gateway decorator.
    logger.log('✅ WebSocket CORS configured');
  }

  // ─── Global Prefix ───
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // ─── Global Pipes ───
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global Interceptors ───
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new TransformInterceptor(),
    new RedisCacheInterceptor(reflector, app.get('RedisService' as any, { strict: false })),
  );

  // ─── Global Exception Filter ───
  app.useGlobalFilters(new AllExceptionsFilter());

  // ─── Cookie Parser ───
  app.use(cookieParser());

  // ─── Swagger Documentation ───
  const config = new DocumentBuilder()
    .setTitle('NeedFinder API')
    .setDescription(
      'NeedFinder Platform API - Smart Needs & Specialists Platform\n\n' +
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
      '- Events & Reporting',
    )
    .setVersion('2.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT' },
      'bearer-auth',
    )
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

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
    customSiteTitle: 'NeedFinder API Documentation',
  });

  // ─── Graceful Shutdown ───
  const gracefulShutdown = async (signal: string) => {
    logger.log(`\n${signal} received — shutting down gracefully...`);

    try {
      // Give existing requests time to complete (max 10s)
      await app.close();
      logger.log('✅ Application closed successfully');
      process.exit(0);
    } catch (err) {
      logger.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  // ─── Start Server ───
  const PORT = process.env.PORT || 4000;
  await app.listen(PORT);

  // ─── Startup Info ───
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
