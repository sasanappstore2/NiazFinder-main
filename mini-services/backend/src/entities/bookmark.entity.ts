import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';

export enum BookmarkType {
  REQUEST = 'REQUEST',
  SPECIALIST = 'SPECIALIST',
}

@Entity('bookmarks')
@Unique('uq_bookmark_target', ['userId', 'type', 'targetId'])
@Index(['userId'])
@Index(['type'])
@Index(['targetId'])
export class Bookmark extends BaseEntity {
  @Column({
    type: 'enum',
    enum: BookmarkType,
  })
  type: BookmarkType;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => require('./user.entity').User, (user: any) => user.bookmarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: any;

  @Column({ type: 'text' })
  targetId: string;
}
