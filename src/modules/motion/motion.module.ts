import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmExModule } from '@common/database/typeorm-ex.module';

import { MotionWorker } from './queue/motion.worker';
import { AnalyzerClient } from './queue/analyzer.client';

import { StorageModule } from '@modules/storage/storage.module';
import { AnalysisModule } from '@modules/analysis/analysis.module';
import { MotionRepository } from '@modules/motion/entities/motion.repository';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';
import { MotionsController } from '@modules/motion/motion.controller';
import { MotionService } from '@modules/motion/motion.service';
import { SportModule } from '@modules/sport/sport.module';
import { MotionRedisRepository } from '@modules/motion/caches/motion-redis.repository';

@Module({
  imports: [
    TypeOrmExModule.forCustomRepository([MotionRepository]),

    BullModule.registerQueue({
      name: MOTION_CONSTANTS.QUEUE_NAME,
    }),

    StorageModule,
    AnalysisModule,
    SportModule,
  ],
  controllers: [MotionsController],
  providers: [
    MotionService,
    MotionWorker,
    AnalyzerClient,
    MotionRedisRepository,
  ],
  exports: [MotionService],
})
export class MotionModule {}
