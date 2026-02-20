import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { MotionStatus } from '@common/constants/motion-status.enum';
import { StorageType } from '@app/common/constants/storage-type.enum';
import { User } from '@modules/user/entities/user.entity';
import { Sport } from '@modules/sport/entities/sport.entity';

@Entity('motions')
export class Motion extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'sport_id' })
  sportId: number;

  @Column({
    name: 'storage_type',
    type: 'enum',
    enum: StorageType,
    default: StorageType.LOCAL,
  })
  storageType: StorageType;

  @Column({
    type: 'enum',
    enum: MotionStatus,
    default: MotionStatus.UPLOADED,
  })
  status: MotionStatus;

  @Column({ name: 'overall_score', nullable: true })
  overallScore?: number;

  @Column({ name: 'video_key', length: 500 })
  videoKey: string;

  @Column({ name: 'error_code', length: 30, nullable: true })
  errorCode?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'deactivated_at', type: 'timestamp', nullable: true })
  deactivatedAt: Date | null;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Sport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sport_id' })
  sport: Sport;
}
