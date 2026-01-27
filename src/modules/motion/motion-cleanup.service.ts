import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

import { MOTION_CONSTANTS } from '@common/constants/motion.constant';
import { MotionRepository } from './entities/motion.repository';
import { StorageService } from '@modules/storage/storage.service';
import { AnalysisService } from '@modules/analysis/analysis.service';

@Injectable()
export class MotionCleanupService {
  private readonly logger = new Logger(MotionCleanupService.name);

  constructor(
    private readonly motionRepository: MotionRepository,
    private readonly storageService: StorageService,
    private readonly analysisService: AnalysisService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(MOTION_CONSTANTS.CLEANUP_CRON_SCHEDULE)
  async cleanupCron(): Promise<void> {
    const enabled = this.configService.get<boolean>('CLEANUP_ENABLED', false);

    if (!enabled) return;

    await this.deactivatedMotions(new Date());
  }

  // 테스트는 이 runOnce만 호출해서 검증
  async deactivatedMotions(now: Date): Promise<void> {
    const graceDays = this.configService.get<number>(
      'CLEANUP_GRACE_DAYS',
      MOTION_CONSTANTS.DELETION_GRACE_PERIOD_DAYS,
    );

    const threshold = new Date(now.getTime() - graceDays * 24 * 60 * 60 * 1000);

    const motions = await this.motionRepository.findDeactivatedMotions({
      threshold,
      take: MOTION_CONSTANTS.CLEANUP_BATCH_SIZE,
    });

    if (motions.length === 0) return;

    for (const motion of motions) {
      try {
        // TODO..
        // await this.analysisService.deleteByMotionId(motion.id);
        await this.storageService.deleteByKey(motion.videoKey);
        await this.motionRepository.delete({ id: motion.id }); // 최종 삭제
      } catch (err) {
        this.logger.error({
          event: 'cleanup_fail',
          motionId: motion.id,
          message: err?.message,
        });
      }
    }
  }
}
