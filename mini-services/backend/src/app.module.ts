import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
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
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { AdminModule } from './modules/admin/admin.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-key-2024',
      signOptions: { expiresIn: '30d' },
      global: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    RequestsModule,
    ProposalsModule,
    SpecialistsModule,
    ReviewsModule,
    WalletModule,
    ChatModule,
    NotificationsModule,
    ReportsModule,
    ReferralsModule,
    AdminModule,
    SearchModule,
  ],
})
export class AppModule {}
