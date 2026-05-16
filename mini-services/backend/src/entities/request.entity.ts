import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

export enum BudgetType {
  FIXED = 'FIXED',
  HOURLY = 'HOURLY',
  NEGOTIABLE = 'NEGOTIABLE',
}

export enum DeliveryUnit {
  DAY = 'day',
  HOUR = 'hour',
  MONTH = 'month',
}

export enum RequestPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RequestStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('requests')
@Index(['slug'], { unique: true })
@Index(['city'])
@Index(['province'])
@Index(['status'])
@Index(['priority'])
@Index(['categoryId'])
@Index(['userId'])
@Index(['createdAt'])
export class Request extends BaseEntity {
  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'varchar', length: 350, unique: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'float', nullable: true })
  budgetMin: number | null;

  @Column({ type: 'float', nullable: true })
  budgetMax: number | null;

  @Column({
    type: 'enum',
    enum: BudgetType,
    default: BudgetType.FIXED,
  })
  budgetType: BudgetType;

  @Column({ type: 'int', nullable: true })
  deliveryTime: number | null;

  @Column({
    type: 'enum',
    enum: DeliveryUnit,
    default: DeliveryUnit.DAY,
  })
  deliveryUnit: DeliveryUnit;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  @Column({
    type: 'enum',
    enum: RequestPriority,
    default: RequestPriority.NORMAL,
  })
  priority: RequestPriority;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.OPEN,
  })
  status: RequestStatus;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  proposalCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => require('./category.entity').Category, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: any | null;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => require('./user.entity').User, (user: any) => user.requests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: any;

  @Column({ type: 'uuid', nullable: true })
  selectedProposalId: string | null;

  @OneToOne(() => require('./proposal.entity').Proposal, { nullable: true })
  @JoinColumn({ name: 'selected_proposal_id' })
  selectedProposal: any | null;

  @OneToMany(() => require('./proposal.entity').Proposal, (proposal: any) => proposal.request)
  proposals: any[];

  @OneToMany(() => require('./review.entity').Review, (review: any) => review.request)
  reviews: any[];

  @OneToMany(() => require('./conversation.entity').Conversation, (conversation: any) => conversation.request)
  conversations: any[];
}
