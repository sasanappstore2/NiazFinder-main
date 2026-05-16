import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Portfolio } from '../../entities/portfolio.entity';
import { Review } from '../../entities/review.entity';
import { Proposal } from '../../entities/proposal.entity';
import { Skill } from '../../entities/skill.entity';
import { UserSkill } from '../../entities/user-skill.entity';
import { SpecialistsService } from './specialists.service';
import { SpecialistsController } from './specialists.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Portfolio, Review, Proposal, Skill, UserSkill])],
  controllers: [SpecialistsController],
  providers: [SpecialistsService],
  exports: [SpecialistsService],
})
export class SpecialistsModule {}
