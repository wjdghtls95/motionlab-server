import { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { getTestModule } from '../test-helper/get-test-module';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestSportHelper } from '../test-helper/test-sport.helper';
import { TestUserHelper } from '../test-helper/test-user.helper';
import { TestQueueHelper } from '../test-helper/test-queue.helper';
import { TestMongoHelper } from '../test-helper/test-mongo.helper';

import { MotionService } from '@modules/motion/motion.service';
import { MotionRepository } from '@modules/motion/entities/motion.repository';
import { SportRepository } from '@modules/sport/entities/sport.repository';
import { UserRepository } from '@modules/user/entities/user.repository';

import { sportMockData } from '../mock-data/sport.mock';
import { userMockData } from '../mock-data/user.mock';

import { StorageType } from '@common/constants/storage-type.enum';
import { MotionStatus } from '@common/constants/motion-status.enum';
import { DomainException } from '@common/exceptions/domain.exception';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';

describe('MotionService (Integration)', () => {
  let module: TestingModule;

  let motionService: MotionService;
  let motionRepository: MotionRepository;
  let sportRepository: SportRepository;
  let userRepository: UserRepository;

  let queue: Queue;

  beforeAll(async () => {
    module = await getTestModule;

    motionService = module.get<MotionService>(MotionService);
    motionRepository = module.get<MotionRepository>(MotionRepository);
    sportRepository = module.get<SportRepository>(SportRepository);
    userRepository = module.get<UserRepository>(UserRepository);

    queue = module.get<Queue>(getQueueToken(MOTION_CONSTANTS.QUEUE_NAME));

    await TestDatabaseHelper.initialize(module);
    TestSportHelper.initialize(sportRepository);
    TestUserHelper.initialize(userRepository);
    TestQueueHelper.initialize(module);
    TestMongoHelper.initialize(module);
  });

  beforeEach(async () => {
    await TestDatabaseHelper.clearAll();
    await TestMongoHelper.clearAll();
    await TestQueueHelper.clear(MOTION_CONSTANTS.QUEUE_NAME);

    TestSportHelper.resetCounter();
    TestUserHelper.resetCounter();
  });

  afterAll(async () => {
    await TestQueueHelper.clear(MOTION_CONSTANTS.QUEUE_NAME);
    await TestDatabaseHelper.close();
    if (module) {
      await module.close();
    }
  });

  describe('createAndEnqueue', () => {
    it('✅ motion 생성 + Redis에 job 생성되어야 한다 (D24)', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      const motion = await motionService.createAndEnqueue({
        userId: user.id,
        sportId: sport.id,
        videoKey: 'motions/u1/golf/sample.mp4',
        storageType: StorageType.LOCAL,
      });

      expect(motion.id).toBeDefined();
      expect(motion.status).toBe(MotionStatus.UPLOADED);

      // DB 저장 확인
      const saved = await motionRepository.findWorkById(motion.id);
      expect(saved).toBeDefined();

      // ✅ 무-mock 검증: 실제 Redis에 job 존재 확인
      const jobId = `motion-${motion.id}`;
      const job = await queue.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.name).toBe(MOTION_CONSTANTS.JOB_NAME);
      expect(job?.data).toEqual({ motionId: motion.id });
    });

    it('❌ sportId가 없으면 DomainException(SPORT_NOT_FOUND)이어야 한다', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);

      await expect(
        motionService.createAndEnqueue({
          userId: user.id,
          sportId: 999999,
          videoKey: 'motions/u1/golf/sample.mp4',
          storageType: StorageType.LOCAL,
        }),
      ).rejects.toThrow(DomainException);
    });
  });
});
