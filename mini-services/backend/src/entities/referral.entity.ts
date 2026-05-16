import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ReferralStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

@Entity('referrals')
@Index(['referrerId'])
@Index(['code'])
export class Referral extends BaseEntity {
  @Column({ type: 'uuid' })
  referrerId: string;

  @ManyToOne(() => require('./user.entity').User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_id' })
  referrer: any;

  @Column({ type: 'uuid', unique: true })
  referredId: string;

  @ManyToOne(() => require('./user.entity').User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referred_id' })
  referred: any;

  @Column({ type: 'text' })
  code: string;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  @Column({ type: 'float', default: 0 })
  reward: number;

  @Column({ type: 'boolean', default: false })
  rewardPaid: boolean;
}
