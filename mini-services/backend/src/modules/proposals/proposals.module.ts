import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal } from '../../entities/proposal.entity';
import { Request } from '../../entities/request.entity';
import { User } from '../../entities/user.entity';
import { Review } from '../../entities/review.entity';
import { Notification } from '../../entities/notification.entity';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';

@Module({
  imports: [TypeOrmModule.forFeature([Proposal, Request, User, Review, Notification])],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
