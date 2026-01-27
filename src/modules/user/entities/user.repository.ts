import { CustomRepository } from '@common/decorators/custom-repository.decorator';
import { User } from '@modules/user/entities/user.entity';
import { BaseRepository } from '@common/repositories/base.repository';

@CustomRepository(User)
export class UserRepository extends BaseRepository<User> {
  /**
   * 이메일로 유저 조회
   */
  async findByEmail(email: string): Promise<User> {
    return await this.getQueryBuilder
      .addSelect(`${this.alias}.password`)
      .where(`${this.alias}.email=:email`, { email })
      .getOne();
  }

  /**
   * 전체 유저 조회
   */
  async findAll(): Promise<User[]> {
    return await this.getQueryBuilder.getMany();
  }
}
