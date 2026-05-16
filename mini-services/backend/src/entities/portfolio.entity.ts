import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('portfolios')
@Index(['userId'])
@Index(['isPublished'])
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', default: '[]' })
  imageUrls: string;

  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  videoUrl: string;

  @Column({ type: 'text', nullable: true })
  projectUrl: string;

  @Column({ type: 'text', nullable: true })
  clientName: string;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => require('./user.entity').User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
