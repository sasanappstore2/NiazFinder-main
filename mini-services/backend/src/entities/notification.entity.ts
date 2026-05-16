import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

export enum NotificationType {
  MESSAGE = 'MESSAGE',
  PROPOSAL = 'PROPOSAL',
  REVIEW = 'REVIEW',
  PAYMENT = 'PAYMENT',
  SYSTEM = 'SYSTEM',
  ACHIEVEMENT = 'ACHIEVEMENT',
}

@Entity('notifications')
@Index(['type'])
@Index(['userId'])
@Index(['isRead'])
@Index(['createdAt'])
export class Notification extends BaseEntity {
  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'simple-json', default: '{}' })
  data: Record<string, unknown>;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => require('./user.entity').User, (user: any) => user.notifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: any;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;
}
