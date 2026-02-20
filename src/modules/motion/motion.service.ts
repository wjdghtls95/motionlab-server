import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { MotionStatus } from '@common/constants/motion-status.enum';
import { StorageType } from '@common/constants/storage-type.enum';
import { DomainException } from '@common/exceptions/domain.exception';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';

import { Motion } from './entities/motion.entity';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';
import { MotionRepository } from '@modules/motion/entities/motion.repository';
import { BaseJobError, JOB_ERRORS } from '@common/constants/errors/job.errors';
import { SportRepository } from '@modules/sport/entities/sport.repository';
import { StorageService } from '@modules/storage/storage.service';

@Injectable()
export class MotionService {
  private readonly logger = new Logger(MotionService.name);

  constructor(
    @InjectQueue(MOTION_CONSTANTS.QUEUE_NAME)
    private readonly queue: Queue,
    private readonly storageService: StorageService,

    private readonly motionRepository: MotionRepository,
    private readonly sportRepository: SportRepository,
  ) {}

  /**
   * Motion 생성 및 분석 작업 Queue 등록
   */
  async createAndEnqueue(params: {
    userId: number;
    sportId: number;
    videoKey: string;
    storageType: StorageType;
  }): Promise<Motion> {
    const sport = await this.sportRepository.findById(params.sportId);

    if (!sport) {
      throw new DomainException(DOMAIN_ERRORS.SPORT_NOT_FOUND);
    }

    const motion = await this.motionRepository.save(
      Motion.create({
        ...params,
        status: MotionStatus.UPLOADED,
        isActive: true,
      }),
    );

    const checkEnqueue = await this.enqueueMotion(motion.id, params.videoKey);

    // enqueue 실패는 업로드 자체 실패로 죽이지 않고(정책) motionId는 반환하되 FAILED 상태로 남김
    if (!checkEnqueue) {
      return motion;
    }

    return motion;
  }

  /**
   * 사용자별 Motion 목록 조회
   */
  async getMotionList(
    userId: number,
    skip: number,
    take: number,
    status?: MotionStatus,
  ) {
    return this.motionRepository.findActiveByUserIdPaged({
      userId,
      skip,
      take,
      status,
    });
  }

  /**
   * Motion 상세 조회 (권한 검증 포함)
   */
  async getMotionDetail(userId: number, motionId: number): Promise<Motion> {
    const motion = await this.motionRepository.findDetailByIdAndUserId(
      motionId,
      userId,
    );

    if (!motion) {
      throw new DomainException(DOMAIN_ERRORS.MOTION_NOT_FOUND);
    }

    return motion;
  }

  /**
   * 재시도: FAILED인 motion을 다시 큐에 등록
   */
  async retryEnqueue(userId: number, motionId: number): Promise<Motion> {
    const motion = await this.motionRepository.findDetailByIdAndUserId(
      motionId,
      userId,
    );
    if (!motion) throw new DomainException(DOMAIN_ERRORS.MOTION_NOT_FOUND);

    if (motion.status !== MotionStatus.FAILED) {
      throw new DomainException(DOMAIN_ERRORS.MOTION_RETRY_NOT_ALLOWED);
    }

    // enqueue 실패는 파일을 삭제했고 retry하면 무조건 실패함 -> 재업 유도
    if (motion.errorCode === JOB_ERRORS.SYS_QUEUE_ENQUEUE_FAILED.code) {
      throw new DomainException(DOMAIN_ERRORS.MOTION_REUPLOAD_REQUIRED);
    }

    // 실패 정보 초기화 + 상태 되돌림 (UPLOADED로 다시 대기 상태)
    await this.motionRepository.updateById(motionId, {
      status: MotionStatus.UPLOADED,
      errorCode: null,
      errorMessage: null,
      completedAt: null,
    });

    const checkEnqueue = await this.enqueueMotion(motionId, motion.videoKey);

    if (!checkEnqueue) {
      // 다시 실패하면 FAILED로 남기고 그대로 반환(프론트에서 다시 retry 가능)
      return await this.motionRepository.findDetailByIdAndUserId(
        motionId,
        userId,
      );
    }

    return await this.motionRepository.findDetailByIdAndUserId(
      motionId,
      userId,
    );
  }

  /**
   * 비활성화 (제거)
   */
  async deactivate(userId: number, motionId: number): Promise<void> {
    const motion = await this.motionRepository.findDetailByIdAndUserId(
      motionId,
      userId,
    );

    if (!motion) {
      throw new DomainException(DOMAIN_ERRORS.MOTION_NOT_FOUND);
    }

    await this.motionRepository.updateById(motionId, {
      isActive: false,
      deactivatedAt: new Date(),
    });
  }

  /**
   * Worker용 -> 분석 작업에 필요한 Motion 조회
   */
  async getMotionForWork(motionId: number): Promise<Motion> {
    const motion = await this.motionRepository.findWorkById(motionId);

    // motion or motion 연관된 sport 체크
    if (!motion || !motion.sport) {
      throw new DomainException(DOMAIN_ERRORS.MOTION_NOT_FOUND);
    }

    return motion;
  }

  /**
   * 상태 업데이트 (비즈니스 로직 포함)
   */
  async updateStatus(motionId: number, newStatus: MotionStatus): Promise<void> {
    const updateData: any = { status: newStatus };
    const now = new Date();

    // 상태별 자동 처리
    if (newStatus === MotionStatus.COMPLETED) {
      updateData.completedAt = now;
      updateData.errorCode = null;
      updateData.errorMessage = null;
    }

    await this.motionRepository.updateById(motionId, updateData);

    this.logger.log({ event: 'status_updated', motionId, status: newStatus });
  }

  /**
   * 에러와 함께 상태 업데이트
   */
  async updateStatusWithError(
    motionId: number,
    status: MotionStatus,
    error: BaseJobError,
  ): Promise<void> {
    await this.motionRepository.updateById(motionId, {
      status,
      errorCode: error.code,
      errorMessage: error.message,
    });

    this.logger.error({
      event: 'status_error',
      motionId,
      status,
      errorCode: error.code,
    });
  }

  /**
   * 분석 완료 시 상태 + 점수 동시 저장
   */
  async completeWithScore(
    motionId: number,
    overallScore: number | null,
  ): Promise<void> {
    await this.motionRepository.update(motionId, {
      status: MotionStatus.COMPLETED,
      completedAt: new Date(),
      overallScore: overallScore ?? null,
      errorCode: null,
      errorMessage: null,
    });

    this.logger.log({
      event: 'motion_completed_with_score',
      motionId,
      overallScore,
    });
  }

  /**
   * BullMQ enqueue 공통 로직
   * - jobId 중복 방지: 기존 job 있으면 remove 후 재등록
   * - 실패 시 motions에 FAILED + SYS_QUEUE_ENQUEUE_FAILED 기록
   */
  private async enqueueMotion(
    motionId: number,
    videoKey: string,
  ): Promise<boolean> {
    const jobId = `motion-${motionId}`;

    try {
      const existing = await this.queue.getJob(jobId);

      if (existing) {
        await existing.remove();
      }

      await this.queue.add(
        MOTION_CONSTANTS.JOB_NAME,
        { motionId },
        {
          jobId,
          attempts: MOTION_CONSTANTS.MAX_ATTEMPTS,
          backoff: MOTION_CONSTANTS.BACKOFF,
          removeOnComplete: MOTION_CONSTANTS.JOB_RETENTION.COMPLETE,
          removeOnFail: MOTION_CONSTANTS.JOB_RETENTION.FAIL,
        },
      );

      this.logger.log({ event: 'motion_enqueued', motionId });
      return true;
    } catch (e) {
      this.logger.error({ event: 'enqueue_failed', motionId });

      // 즉시 삭제
      await this.storageService.deleteByKey(videoKey).catch((err) => {
        this.logger.warn({
          event: 'rollback_delete_failed',
          motionId,
          videoKey,
          message: err?.message,
        });
      });

      // 정책: motion 삭제 X, FAILED 기록
      await this.updateStatusWithError(
        motionId,
        MotionStatus.FAILED,
        JOB_ERRORS.SYS_QUEUE_ENQUEUE_FAILED,
      );

      return false;
    }
  }
}
