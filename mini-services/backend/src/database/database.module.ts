import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Request } from '../entities/request.entity';
import { Proposal } from '../entities/proposal.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { Review } from '../entities/review.entity';
import { Skill } from '../entities/skill.entity';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { Notification } from '../entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'needfinder',
      password: process.env.DATABASE_PASSWORD || 'needfinder123',
      database: process.env.DATABASE_NAME || 'needfinder',
      entities: [
        User,
        Category,
        Request,
        Proposal,
        Portfolio,
        Review,
        Skill,
        Wallet,
        Transaction,
        Notification,
      ],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    TypeOrmModule.forFeature([
      User,
      Category,
      Request,
      Proposal,
      Portfolio,
      Review,
      Skill,
      Wallet,
      Transaction,
      Notification,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
