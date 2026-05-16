import {
  Entity,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ProposalDeliveryUnit {
  DAY = 'day',
  HOUR = 'hour',
  MONTH = 'month',
}

export enum ProposalStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

@Entity('proposals')
@Index(['status'])
@Index(['requestId'])
@Index(['specialistId'])
export class Proposal extends BaseEntity {
  @Column({ type: 'text' })
  coverLetter: string;

  @Column({ type: 'float', nullable: true })
  estimatedBudget: number | null;

  @Column({ type: 'int', nullable: true })
  estimatedTime: number | null;

  @Column({
    type: 'enum',
    enum: ProposalDeliveryUnit,
    default: ProposalDeliveryUnit.DAY,
  })
  deliveryUnit: ProposalDeliveryUnit;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.PENDING,
  })
  status: ProposalStatus;

  @Column({ type: 'uuid' })
  requestId: string;

  @ManyToOne(() => require('./request.entity').Request, (request: any) => request.proposals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: any;

  @Column({ type: 'uuid' })
  specialistId: string;

  @ManyToOne(() => require('./user.entity').User, (user: any) => user.proposals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specialist_id' })
  specialist: any;

  @OneToOne(() => require('./review.entity').Review, (review: any) => review.proposal, { nullable: true })
  review: any | null;
}
