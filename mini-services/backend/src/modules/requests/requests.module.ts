import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Request } from '../../entities/request.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import { Proposal } from '../../entities/proposal.entity';
import { Review } from '../../entities/review.entity';
import { Notification } from '../../entities/notification.entity';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([Request, Category, User, Proposal, Review, Notification])],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
