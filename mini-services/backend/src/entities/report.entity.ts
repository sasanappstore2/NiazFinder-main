import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ReportType {
  USER = 'USER',
  REQUEST = 'REQUEST',
  PROPOSAL = 'PROPOSAL',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
}

@Entity('reports')
@Index(['reporterId'])
@Index(['type'])
@Index(['targetId'])
@Index(['status'])
export class Report extends BaseEntity {
  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportType,
  })
  type: ReportType;

  @Column({ type: 'uuid' })
  reporterId: string;

  @ManyToOne(() => require('./user.entity').User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: any;

  @Column({ type: 'text' })
  targetId: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ type: 'uuid', nullable: true })
  resolverId: string | null;

  @ManyToOne(() => require('./user.entity').User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolver_id' })
  resolver: any | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
