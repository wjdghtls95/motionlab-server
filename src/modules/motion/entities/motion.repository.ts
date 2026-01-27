import { CustomRepository } from '@common/decorators/custom-repository.decorator';
import { Motion } from '@modules/motion/entities/motion.entity';
import { BaseRepository } from '@common/repositories/base.repository';
import { MotionStatus } from '@common/constants/motion-status.enum';

@CustomRepository(Motion)
export class MotionRepository extends BaseRepository<Motion> {
  /**
   * 사용자 권한 검증 + 상세 조회
   */
  async findDetailByIdAndUserId(
    motionId: number,
    userId: number,
  ): Promise<Motion> {
    return await this.getQueryBuilder
      .leftJoinAndSelect(`${this.alias}.sport`, 'sport')
      .where(`${this.alias}.id = :motionId`, { motionId })
      .andWhere(`${this.alias}.userId = :userId`, { userId })
      .andWhere(`${this.alias}.isActive = true`)
      .getOne();
  }

  /**
   * 사용자별 목록 조회 (페이징)
   */
  async findActiveByUserIdPaged(params: {
    userId: number;
    skip: number;
    take: number;
    status?: MotionStatus;
  }) {
    const qb = this.getQueryBuilder
      .leftJoinAndSelect(`${this.alias}.sport`, 'sport')
      .where(`${this.alias}.userId = :userId`, { userId: params.userId })
      .andWhere(`${this.alias}.isActive = true`)
      .orderBy(`${this.alias}.createAt`, 'DESC')
      .addOrderBy(`${this.alias}.id`, 'DESC')
      .skip(params.skip)
      .take(params.take);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Worker 전용 -> 분석 작업용 조회
   */
  async findWorkById(motionId: number): Promise<Motion | null> {
    return this.getQueryBuilder
      .leftJoinAndSelect(`${this.alias}.sport`, 'sport')
      .where(`${this.alias}.id = :motionId`, { motionId })
      .getOne();
  }

  /**
   * TTL 대상 삭제
   */
  async findDeactivatedMotions(params: {
    threshold: Date;
    take: number;
  }): Promise<Motion[]> {
    return this.getQueryBuilder
      .where(`${this.alias}.isActive=false`)
      .andWhere(`${this.alias}.deactivatedAt IS NOT NULL`)
      .andWhere(`${this.alias}.deactivatedAt<:threshold`, {
        threshold: params.threshold,
      })
      .orderBy(`${this.alias}.id`, 'ASC')
      .take(params.take)
      .getMany();
  }
}
