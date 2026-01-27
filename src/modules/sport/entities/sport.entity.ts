import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { SportType } from '@common/constants/sport-types.constant';
import { Motion } from '@modules/motion/entities/motion.entity';

@Entity('sports')
export class Sport extends BaseEntity {
  @Column({ unique: true, length: 50, name: 'sport_type' })
  sportType: SportType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => Motion, (motion) => motion.sport)
  motions: Motion[];
}
