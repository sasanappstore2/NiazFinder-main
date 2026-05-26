import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('typing_analytics_events')
export class TypingAnalyticsEvent extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 64 })
  sessionId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  userId: string | null;

  @Column({ type: 'int', default: 0 })
  textLen: number;

  @Column({ type: 'varchar', length: 64 })
  intent: string;

  @Column({ type: 'varchar', length: 64 })
  categorySlug: string;

  @Column({ type: 'float', default: 0 })
  confidence: number;

  @Column({ type: 'int', default: 0 })
  latencyMs: number;

  @Column({ type: 'boolean', default: false })
  spam: boolean;

  @Column({ type: 'varchar', length: 36, nullable: true })
  requestId: string | null;
}
