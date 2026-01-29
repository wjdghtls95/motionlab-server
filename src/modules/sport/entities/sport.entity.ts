import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import {
  SportType,
  SUB_CATEGORY,
  SubCategoryType,
} from '@common/constants/sport-types.constant';
import { Motion } from '@modules/motion/entities/motion.entity';

@Entity('sports')
@Index(['sportType', 'subCategory'], { unique: true })
export class Sport extends BaseEntity {
  @Column({ name: 'sport_type', length: 50 })
  sportType: SportType;

  @Column({
    name: 'sub_category',
    nullable: false,
    type: 'varchar',
    default: SUB_CATEGORY.NONE,
  })
  subCategory: SubCategoryType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => Motion, (motion) => motion.sport)
  motions: Motion[];
}
