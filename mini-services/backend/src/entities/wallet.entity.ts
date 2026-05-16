import {
  Entity,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('wallets')
@Index(['userId'], { unique: true })
export class Wallet extends BaseEntity {
  @Column({ type: 'float', default: 0 })
  balance: number;

  @Column({ type: 'float', default: 0 })
  frozen: number;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => require('./user.entity').User, 'wallet', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: any;

  @OneToMany(() => require('./transaction.entity').Transaction, (transaction: any) => transaction.wallet)
  transactions: any[];
}
