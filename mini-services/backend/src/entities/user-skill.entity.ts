import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('user_skills')
@Index(['userId'])
@Index(['skillId'])
@Index(['userId', 'skillId'], { unique: true })
export class UserSkill extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // Lazy require to avoid circular dependency with user.entity.ts
  @ManyToOne(() => require('./user.entity').User, { onDelete: 'CASCADE' })
  user: any;

  @Column({ name: 'skill_id', type: 'uuid' })
  skillId: string;

  @ManyToOne(() => require('./skill.entity').Skill, { onDelete: 'CASCADE' })
  skill: any;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  experience: string;
}
