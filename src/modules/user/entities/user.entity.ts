import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('users')
@Index('IDX_USER_EMAIL', ['email'], { unique: true }) // 명시적 인덱스 이름
export class User extends BaseEntity {
  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;
}
