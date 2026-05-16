import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('conversations')
@Index(['lastMessageAt'])
export class Conversation extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  requestId: string | null;

  @ManyToOne(() => require('./request.entity').Request, (request: any) => request.conversations, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'request_id' })
  request: any | null;

  @Column({ type: 'text', nullable: true })
  lastMessage: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'simple-json', default: '{}' })
  unreadCounts: Record<string, number>;

  @ManyToMany(() => require('./user.entity').User, (user: any) => user.conversations, { eager: true })
  @JoinTable({
    name: 'conversation_participants',
    joinColumn: { name: 'conversation_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  participants: any[];

  @OneToMany(() => require('./message.entity').Message, (message: any) => message.conversation)
  messages: any[];
}
