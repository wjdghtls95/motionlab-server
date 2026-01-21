import { BaseRepository } from '@app/common/repositories/base.repository';
import { CustomRepository } from '@common/decorators/custom-repository.decorator';
import { Sport } from '@modules/sport/entities/sport.entity';
import { SportType } from '@common/constants/sport-types.constant';

@CustomRepository(Sport)
export class SportRepository extends BaseRepository<Sport> {
  /**
   * 활성화된 모든 운동 종목 조회
   */
  async findAllSports(): Promise<Sport[]> {
    return await this.getQueryBuilder
      .where(`${this.alias}.isActive=:isActive`, { isActive: true })
      .orderBy(`${this.alias}.sportType`, 'ASC')
      .getMany();
  }

  /**
   * 운동 종목 타입으로 조회
   */
  async findBySportType(sportType: SportType): Promise<Sport> {
    return await this.getQueryBuilder
      .where(`${this.alias}.sportType=:sportType`, { sportType: sportType })
      .getOne();
  }
}
