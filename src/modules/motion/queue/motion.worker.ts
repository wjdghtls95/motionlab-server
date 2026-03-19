import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

import { MotionStatus } from '@common/constants/motion-status.enum';

import { AnalyzerClient } from './analyzer.client';
import { AnalysisService } from '@modules/analysis/analysis.service';
import { StorageService } from '@modules/storage/storage.service';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';
import { JOB_ERRORS } from '@common/constants/errors/job.errors';
import { MotionService } from '@modules/motion/motion.service';
import { MotionRedisRepository } from '@modules/motion/caches/motion-redis.repository';

// TODO(v2.0): MotionGateway 연결 — Worker에서 직접 emit하지 않고 Redis PubSub 또는 Notifier 서비스로 분리 권장

@Processor(MOTION_CONSTANTS.QUEUE_NAME, {
  lockDuration: MOTION_CONSTANTS.WORKER_LOCK_DURATION,
  stalledInterval: MOTION_CONSTANTS.WORKER_STALLED_INTERVAL,
})
export class MotionWorker extends WorkerHost {
  private readonly logger = new Logger(MotionWorker.name);

  constructor(
    // private readonly gateway: MotionGateway, // TODO(v2.0): MotionModule 등록 후 연결
    private readonly motionService: MotionService,
    private readonly analyzerClient: AnalyzerClient,
    private readonly analysisService: AnalysisService,
    private readonly storageService: StorageService,
    private readonly motionRedisRepository: MotionRedisRepository,
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

    try {
      // getMotionForWork를 try 내부에서 호출하여 DB 접근 실패 시에도
      // handleJobError를 통해 status가 FAILED로 전환되도록 보장
      const motion = await this.motionService.getMotionForWork(motionId);

      if (motion.status === MotionStatus.COMPLETED) {
        this.logger.warn({
          event: 'job_skipped',
          motionId,
          reason: 'already_completed',
        });

        return;
      }

      if (job.attemptsMade === 0) {
        await this.motionService.updateStatus(
          motionId,
          MotionStatus.PROCESSING,
        );

        // TODO(v2.0): gateway.emitProgress(motionId, { status: MotionStatus.PROCESSING });
      }

      let analyzed = await this.motionRedisRepository.get(motionId);

      if (analyzed) {
        this.logger.log({
          event: 'checkpoint_reused',
          motionId,
          attemptsMade: job.attemptsMade,
        });
      } else {
        // Worker 실행 시점에 videoUrl 생성
        const videoUrl = await this.storageService.getDownloadUrl(
          motion.videoKey,
        );

        analyzed = await this.analyzerClient.analyze({
          motionId,
          sportType: motion.sport.sportType, // Sport 엔티티 필드명 확인 필요
          subCategory: motion.sport.subCategory,
          videoUrl,
        });

        // AI 분석 완료 즉시 Redis에 저장 (MongoDB 저장 전)
        // 이후 어떤 단계에서 장애가 나도 재시도 시 여기서 복구
        await this.motionRedisRepository.save(motionId, analyzed);
      }

      // MongoDB upsert
      await this.analysisService.upsertResult({
        motionId,
        ...analyzed,
      });

      await this.motionService.completeWithScore(
        motionId,
        analyzed.overallScore,
      );

      // 저장 성공 후 cache 삭제
      await this.motionRedisRepository.delete(motionId);

      // TODO(v2.0): gateway.emitCompleted(motionId, { motionId });

      this.logger.log({ event: 'job_completed', motionId });
    } catch (err) {
      await this.handleJobError(job, motionId, err);
    }
  }

  /**
   * BullMQ 잡 실패 이벤트 — 모든 시도(retry 포함)마다 호출됨
   *
   * 에러 등급 분류 (R-044):
   * - AN_ 접두사: 사용자 영상 품질 문제 (예상된 실패) → Winston 경고 로그만 기록
   * - SYS_/LLM_/UNKNOWN: 시스템 장애 → Sentry 캡처
   *   - 최종 실패(isLastAttempt): Sentry 'fatal' (즉시 알림)
   *   - 재시도 중 실패: Sentry 'warning' (수집만)
   *
   * 전체 에러 등급 체계 확대 적용은 R-052 참고
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    const errorCode: string = (error as any).code ?? 'UNKNOWN';
    const isLastAttempt = job.attemptsMade >= MOTION_CONSTANTS.MAX_ATTEMPTS;

    // AN_ 에러: 사용자 영상 품질 문제 — Sentry 전송 불필요, Winston 로그만
    if (errorCode.startsWith('AN_')) {
      this.logger.warn({
        event: 'job_failed_analysis',
        motionId: job.data.motionId,
        jobId: job.id,
        errorCode,
        attemptsMade: job.attemptsMade,
      });
      return;
    }

    // SYS_/LLM_/UNKNOWN: 시스템 장애 → Sentry 캡처
    const sentryLevel = isLastAttempt ? 'fatal' : 'warning';

    Sentry.captureException(error, {
      level: sentryLevel,
      extra: {
        jobId: job.id,
        motionId: job.data.motionId,
        errorCode,
        attemptsMade: job.attemptsMade,
        isLastAttempt,
      },
      tags: {
        queue: MOTION_CONSTANTS.QUEUE_NAME,
        errorCode,
      },
    });

    this.logger.error({
      event: 'job_failed_system',
      motionId: job.data.motionId,
      errorCode,
      sentryLevel,
      isLastAttempt,
    });
  }

  /**
   * Job 에러 처리 — 재시도 가능 여부에 따라 RETRYING 또는 FAILED로 status 전환
   * updateStatusWithError 자체가 실패해도 에러 로그 후 반드시 throw하여
   * BullMQ가 잡을 재처리하거나 실패로 기록하도록 보장
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
      try {
        await this.motionService.updateStatusWithError(
          motionId,
          MotionStatus.RETRYING,
          mapped,
        );
      } catch (updateErr) {
        // status 업데이트 실패는 로그만 남기고 재시도 신호(throw)는 유지
        this.logger.error({
          event: 'status_update_failed',
          motionId,
          targetStatus: MotionStatus.RETRYING,
          cause: (updateErr as Error)?.message,
        });
      }

      // TODO(v2.0): gateway.emitProgress(motionId, { status: MotionStatus.RETRYING });
      throw err; // 재시도
    }

    // 최종 실패 확정 — DB 오류가 발생해도 job은 failed로 처리
    try {
      await this.motionService.updateStatusWithError(
        motionId,
        MotionStatus.FAILED,
        mapped,
      );
    } catch (updateErr) {
      this.logger.error({
        event: 'status_update_failed',
        motionId,
        targetStatus: MotionStatus.FAILED,
        cause: (updateErr as Error)?.message,
      });
    }

    // TODO(v2.0): gateway.emitFailed(motionId, { code: mapped.code, message: mapped.message });

    // 재시도 가치 없으면 attempts 남아도 차단
    if (!mapped.retryable) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      job.discard();
    }

    // job도 failed로 남김 (운영 정합성)
    const e = new Error(mapped.message);
    (e as any).code = mapped.code;
    throw e;
  }
}
