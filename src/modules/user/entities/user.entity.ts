import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Motion } from '@modules/motion/entities/motion.entity';
import { UserRole } from '@common/enums/user-role.enum';

@Entity('users')
@Index('IDX_USER_EMAIL', ['email'], { unique: true }) // 명시적 인덱스 이름
export class User extends BaseEntity {
  @Column()
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @OneToMany(() => Motion, (m) => m.user)
  motions: Motion[];
}
