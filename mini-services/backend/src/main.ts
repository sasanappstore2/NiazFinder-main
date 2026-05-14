import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: ['http://localhost:3000', '*'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
  });

  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

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

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use(cookieParser());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('نیاز فایندر API')
    .setDescription('API پلتفرم نیاز فایندر - پلتفرم هوشمند نیاز و متخصص')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'احراز هویت')
    .addTag('Users', 'کاربران')
    .addTag('Categories', 'دسته‌بندی‌ها')
    .addTag('Requests', 'نیازها / درخواست‌های خدمت')
    .addTag('Proposals', 'پیشنهادها')
    .addTag('Specialists', 'متخصص‌ها')
    .addTag('Reviews', 'نظرات و امتیازات')
    .addTag('Wallet', 'کیف پول و تراکنش‌ها')
    .addTag('Chat', 'پیام‌رسانی')
    .addTag('Notifications', 'اعلان‌ها')
    .addTag('Reports', 'گزارش‌ها')
    .addTag('Referrals', 'دعوت از دوستان')
    .addTag('Admin', 'پنل مدیریت')
    .addTag('Search', 'جستجو')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);
  console.log(`🚀 NeedFinder API running on http://localhost:${PORT}`);
  console.log(`📖 Swagger docs at http://localhost:${PORT}/api/docs`);
}

bootstrap();
