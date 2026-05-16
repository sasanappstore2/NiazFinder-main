import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  SYSTEM_BLOCKED = 'SYSTEM_BLOCKED',
}

@Entity('messages')
@Index(['conversationId'])
@Index(['senderId'])
@Index(['createdAt'])
export class Message extends BaseEntity {
  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'uuid' })
  senderId: string;

  @ManyToOne(() => require('./user.entity').User, (user: any) => user.sentMessages, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'sender_id' })
  sender: any;

  @Column({ type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => require('./conversation.entity').Conversation, (conversation: any) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: any;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'simple-json', default: '[]' })
  readBy: string[];

  @Column({ type: 'text', nullable: true })
  fileUrl: string | null;

  @Column({ type: 'text', nullable: true })
  fileName: string | null;

  @Column({ type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, unknown>;
}
