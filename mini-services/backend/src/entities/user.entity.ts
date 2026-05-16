import {
  Entity,
  Column,
  OneToOne,
  OneToMany,
  ManyToMany,
  ManyToOne,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

export enum UserRole {
  CLIENT = 'CLIENT',
  SPECIALIST = 'SPECIALIST',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'])
@Index(['city'])
@Index(['province'])
@Index(['role'])
@Index(['displayName'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  displayName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  projectCount: number;

  @Column({ type: 'float', default: 0 })
  completionRate: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  emailVerificationToken: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetPasswordExpires: Date | null;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  referralCode: string | null;

  @Column({ type: 'uuid', nullable: true })
  referredById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referred_by_id' })
  referredBy: any | null;

  @OneToOne(() => require('./wallet.entity').Wallet, (wallet: any) => wallet.user, { cascade: true })
  @JoinColumn()
  wallet: any;

  @OneToMany(() => require('./skill.entity').Skill, (skill: any) => skill.user)
  skills: any[];

  @ManyToMany(() => require('./conversation.entity').Conversation, (conversation: any) => conversation.participants)
  conversations: any[];

  @OneToMany(() => require('./message.entity').Message, (message: any) => message.sender)
  sentMessages: any[];

  @OneToMany(() => require('./review.entity').Review, (review: any) => review.author)
  reviews: any[];

  @OneToMany(() => require('./review.entity').Review, (review: any) => review.targetUser)
  receivedReviews: any[];

  @OneToMany(() => require('./request.entity').Request, (request: any) => request.user)
  requests: any[];

  @OneToMany(() => require('./proposal.entity').Proposal, (proposal: any) => proposal.specialist)
  proposals: any[];

  @OneToMany(() => require('./bookmark.entity').Bookmark, (bookmark: any) => bookmark.user)
  bookmarks: any[];

  @OneToMany(() => require('./notification.entity').Notification, (notification: any) => notification.user)
  notifications: any[];

  @OneToMany(() => require('./audit-log.entity').AuditLog, (auditLog: any) => auditLog.user)
  auditLogs: any[];
}
