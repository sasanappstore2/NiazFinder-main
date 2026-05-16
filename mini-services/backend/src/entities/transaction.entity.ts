import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  BONUS = 'BONUS',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('transactions')
@Index(['type'])
@Index(['status'])
@Index(['walletId'])
@Index(['createdAt'])
export class Transaction extends BaseEntity {
  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.DEPOSIT,
  })
  type: TransactionType;

  @Column({ type: 'float' })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid' })
  walletId: string;

  @ManyToOne(() => require('./wallet.entity').Wallet, (wallet: any) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet: any;

  @Column({ type: 'uuid', nullable: true })
  requestId: string | null;

  @ManyToOne(() => require('./request.entity').Request, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'request_id' })
  request: any | null;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, unknown>;
}
