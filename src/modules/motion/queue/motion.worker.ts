import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

import { MotionStatus } from '@common/constants/motion-status.enum';

import { AnalyzerClient } from './analyzer.client';
import { AnalysisService } from '@modules/analysis/analysis.service';
import { StorageService } from '@modules/storage/storage.service';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';
import { JOB_ERRORS } from '@common/constants/errors/job.errors';
import { MotionService } from '@modules/motion/motion.service';

// TODO(WS): MotionGateway 스켈레톤은 추가하되, Worker에서 직접 emit은 추후 Notifier/Redis PubSub로 분리 권장

@Processor(MOTION_CONSTANTS.QUEUE_NAME)
export class MotionWorker extends WorkerHost {
  private readonly logger = new Logger(MotionWorker.name);

  constructor(
    // private readonly gateway: MotionGateway, // TODO(WS): 나중에 연결
    private readonly motionService: MotionService,
    private readonly analyzerClient: AnalyzerClient,
    private readonly analysisService: AnalysisService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== MOTION_CONSTANTS.JOB_NAME) return;

    const motionId = Number(job.data.motionId);

    this.logger.log({
      event: 'job_started',
      motionId,
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });

    const motion = await this.motionService.getMotionForWork(motionId);

    if (motion.status === MotionStatus.COMPLETED) {
      this.logger.warn({
        event: 'job_skipped',
        motionId,
        reason: 'already_completed',
      });

      return;
    }

    try {
      if (job.attemptsMade === 0) {
        await this.motionService.updateStatus(
          motionId,
          MotionStatus.PROCESSING,
        );

        // TODO(WS): gateway.emitProgress(motionId, { status: MotionStatus.PROCESSING });
      }

      // Worker 실행 시점에 videoUrl 생성
      const videoUrl = await this.storageService.getDownloadUrl(
        motion.videoKey,
      );

      const analyzed = await this.analyzerClient.analyze({
        motionId,
        sportCode: motion.sport.sportType, // Sport 엔티티 필드명 확인 필요
        videoUrl,
      });

      // MongoDB upsert
      await this.analysisService.upsertResult({
        motionId,
        ...analyzed,
      });

      await this.motionService.updateStatus(motionId, MotionStatus.COMPLETED);

      // TODO(WS): gateway.emitCompleted(motionId, { motionId });

      this.logger.log({ event: 'job_completed', motionId });
    } catch (err) {
      await this.handleJobError(job, motionId, err);
    }
  }

  /**
   * Job Error 조작
   */
  private async handleJobError(job: Job, motionId: number, err: any) {
    const mapped = err?.code ? err : JOB_ERRORS.SYS_UNKNOWN;

    const isLastAttempt = job.attemptsMade >= MOTION_CONSTANTS.MAX_ATTEMPTS - 1;

    this.logger.error({
      event: 'job_error',
      motionId,
      errorCode: mapped.code,
      retryable: mapped.retryable,
      isLastAttempt,
    });

    if (mapped.retryable && !isLastAttempt) {
      await this.motionService.updateStatusWithError(
        motionId,
        MotionStatus.RETRYING,
        mapped,
      );
      // TODO(WS): gateway.emitProgress(motionId, { status: MotionStatus.RETRYING });

      throw err; // 재시도
    }

    // 최종 실패 확정
    await this.motionService.updateStatusWithError(
      motionId,
      MotionStatus.FAILED,
      mapped,
    );

    // TODO(WS): gateway.emitFailed(motionId, { code: mapped.code, message: mapped.message });

    // 재시도 가치 없으면 attempts 남아도 차단
    if (!mapped.retryable) {
      await job.discard();
    }

    // job도 failed로 남김 (운영 정합성)
    // throw err;

    const e = new Error(mapped.message);
    (e as any).code = mapped.code;
    throw e;
  }
}
