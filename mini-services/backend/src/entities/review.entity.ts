import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('reviews')
@Index(['authorId'])
@Index(['targetUserId'])
@Index(['requestId'])
export class Review extends BaseEntity {
  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'int', nullable: true })
  qualityRating: number | null;

  @Column({ type: 'int', nullable: true })
  timingRating: number | null;

  @Column({ type: 'int', nullable: true })
  communicationRating: number | null;

  @Column({ type: 'int', nullable: true })
  professionalismRating: number | null;

  @Column({ type: 'text', nullable: true })
  pros: string | null;

  @Column({ type: 'text', nullable: true })
  cons: string | null;

  @Column({ type: 'boolean', default: false })
  isRecommended: boolean;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @Column({ type: 'uuid', nullable: true })
  proposalId: string | null;

  @ManyToOne(() => require('./proposal.entity').Proposal, (proposal: any) => proposal.review, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'proposal_id' })
  proposal: any | null;

  @Column({ type: 'uuid' })
  authorId: string;

  @ManyToOne(() => require('./user.entity').User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: any;

  @Column({ type: 'uuid' })
  targetUserId: string;

  @ManyToOne(() => require('./user.entity').User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_user_id' })
  targetUser: any;

  @Column({ type: 'uuid' })
  requestId: string;

  @ManyToOne(() => require('./request.entity').Request, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: any;

  @Column({ type: 'float', default: 0 })
  communication: number;

  @Column({ type: 'float', default: 0 })
  quality: number;

  @Column({ type: 'float', default: 0 })
  timing: number;

  @Column({ type: 'float', default: 0 })
  professionalism: number;
}
