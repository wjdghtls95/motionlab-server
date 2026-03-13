import { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Job } from 'bullmq';

import { getTestModule } from '../test-helper/get-test-module';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestSportHelper } from '../test-helper/test-sport.helper';
import { TestUserHelper } from '../test-helper/test-user.helper';
import { TestQueueHelper } from '../test-helper/test-queue.helper';
import { TestMongoHelper } from '../test-helper/test-mongo.helper';

import { MotionService } from '@modules/motion/motion.service';
import { MotionWorker } from '@modules/motion/queue/motion.worker';
import { AnalyzerClient } from '@modules/motion/queue/analyzer.client';
import { AnalysisService } from '@modules/analysis/analysis.service';
import { MotionRepository } from '@modules/motion/entities/motion.repository';
import { SportRepository } from '@modules/sport/entities/sport.repository';
import { UserRepository } from '@modules/user/entities/user.repository';
import { StorageService } from '@modules/storage/storage.service';
import { MotionRedisRepository } from '@modules/motion/caches/motion-redis.repository';

import { sportMockData } from '../mock-data/sport.mock';
import { userMockData } from '../mock-data/user.mock';
import { motionMockData } from '../mock-data/motion.mock';

import { MOTION_CONSTANTS } from '@common/constants/motion.constant';
import { MotionStatus } from '@common/constants/motion-status.enum';
import { DomainException } from '@common/exceptions/domain.exception';

/**
 * Mock Job 생성 헬퍼 — BullMQ Job 인터페이스 최소 구현
 */
function createMockJob(motionId: number, attemptsMade = 0): Job {
  return {
    name: MOTION_CONSTANTS.JOB_NAME,
    data: { motionId },
    attemptsMade,
    id: `motion-${motionId}`,
    discard: jest.fn(),
  } as unknown as Job;
}

describe('Motion Pipeline (Integration)', () => {
  let module: TestingModule;
  let motionService: MotionService;
  let motionWorker: MotionWorker;
  let analyzerClient: AnalyzerClient;
  let analysisService: AnalysisService;
  let storageService: StorageService;
  let motionRepository: MotionRepository;
  let motionRedisRepository: MotionRedisRepository;
  let sportRepository: SportRepository;
  let userRepository: UserRepository;
  let queue: Queue;

  beforeAll(async () => {
    module = await getTestModule;

    motionService = module.get<MotionService>(MotionService);
    motionWorker = module.get<MotionWorker>(MotionWorker);
    analyzerClient = module.get<AnalyzerClient>(AnalyzerClient);
    analysisService = module.get<AnalysisService>(AnalysisService);
    storageService = module.get<StorageService>(StorageService);
    motionRepository = module.get<MotionRepository>(MotionRepository);
    motionRedisRepository = module.get<MotionRedisRepository>(
      MotionRedisRepository,
    );
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
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await TestQueueHelper.clear(MOTION_CONSTANTS.QUEUE_NAME);
    await TestDatabaseHelper.close();
    if (module) await module.close();
  });

  // ──────────────────────────────────────────────────────────
  // 1. 업로드 → Worker 처리 → COMPLETED 파이프라인
  // ──────────────────────────────────────────────────────────
  describe('업로드 → 분석 파이프라인', () => {
    it('✅ motion 생성 → Worker 직접 처리 → COMPLETED + MongoDB 결과 저장', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      // FastAPI 호출 없이 mock 결과 반환
      jest
        .spyOn(analyzerClient, 'analyze')
        .mockResolvedValue(motionMockData.mockAnalysisResult);
      jest
        .spyOn(storageService, 'getDownloadUrl')
        .mockResolvedValue('http://localhost/test.mp4');

      const motion = await motionService.createAndEnqueue({
        userId: user.id,
        sportId: sport.id,
        videoKey: motionMockData.createMotionParams.videoKey,
        storageType: motionMockData.createMotionParams.storageType,
      });

      expect(motion.status).toBe(MotionStatus.UPLOADED);

      // BullMQ job 등록 확인
      const jobId = `motion-${motion.id}`;
      const job = await queue.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.data).toEqual({ motionId: motion.id });

      // Worker 직접 호출 — app.init() 없이 파이프라인 시뮬레이션
      await motionWorker.process(createMockJob(motion.id, 0));

      // MySQL: COMPLETED 상태 + overallScore 저장 확인
      const completedMotion = await motionRepository.findWorkById(motion.id);
      expect(completedMotion.status).toBe(MotionStatus.COMPLETED);
      expect(completedMotion.overallScore).toBe(
        motionMockData.mockAnalysisResult.overallScore,
      );
      expect(completedMotion.completedAt).toBeDefined();

      // MongoDB: 분석 결과 저장 확인
      const analysisResult = await analysisService.findByMotionId(motion.id);
      expect(analysisResult).toBeDefined();
      expect(analysisResult.overallScore).toBe(
        motionMockData.mockAnalysisResult.overallScore,
      );
      expect(analysisResult.promptVersion).toBe(
        motionMockData.mockAnalysisResult.promptVersion,
      );
      expect(analysisResult.improvements).toHaveLength(1);

      // AnalyzerClient 호출 인자 검증
      expect(analyzerClient.analyze).toHaveBeenCalledWith(
        expect.objectContaining({ motionId: motion.id }),
      );
    });

    it('❌ 분석 중 retryable=false 에러 → 마지막 시도에서 FAILED 상태 기록', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      jest.spyOn(analyzerClient, 'analyze').mockRejectedValue({
        code: 'AN_001',
        message: 'AI 분석 실패',
        retryable: false,
      });
      jest
        .spyOn(storageService, 'getDownloadUrl')
        .mockResolvedValue('http://localhost/test.mp4');

      const motion = await motionService.createAndEnqueue({
        userId: user.id,
        sportId: sport.id,
        videoKey: motionMockData.createMotionParams.videoKey,
        storageType: motionMockData.createMotionParams.storageType,
      });

      // MAX_ATTEMPTS - 1로 설정해 마지막 시도 시뮬레이션
      const mockJob = createMockJob(
        motion.id,
        MOTION_CONSTANTS.MAX_ATTEMPTS - 1,
      );
      await expect(motionWorker.process(mockJob)).rejects.toThrow();

      const failedMotion = await motionRepository.findWorkById(motion.id);
      expect(failedMotion.status).toBe(MotionStatus.FAILED);
      expect(failedMotion.errorCode).toBe('AN_001');
    });

    it('✅ 이미 COMPLETED 상태인 motion은 Worker가 건너뛴다', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      const motion = await motionService.createAndEnqueue({
        userId: user.id,
        sportId: sport.id,
        videoKey: motionMockData.createMotionParams.videoKey,
        storageType: motionMockData.createMotionParams.storageType,
      });

      // COMPLETED 상태 직접 설정 (이전 분석 완료 시뮬레이션)
      await motionRepository.updateById(motion.id, {
        status: MotionStatus.COMPLETED,
      });

      const analyzeSpy = jest
        .spyOn(analyzerClient, 'analyze')
        .mockResolvedValue(motionMockData.mockAnalysisResult);
      jest
        .spyOn(storageService, 'getDownloadUrl')
        .mockResolvedValue('http://localhost/test.mp4');

      // COMPLETED motion → Worker 건너뜀 → analyze 미호출
      await motionWorker.process(createMockJob(motion.id, 0));

      expect(analyzeSpy).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. Redis 체크포인트 복구
  // ──────────────────────────────────────────────────────────
  describe('Redis 체크포인트 복구', () => {
    it('✅ Redis 체크포인트 존재 시 AnalyzerClient 미호출로 완료', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      const motion = await motionService.createAndEnqueue({
        userId: user.id,
        sportId: sport.id,
        videoKey: motionMockData.createMotionParams.videoKey,
        storageType: motionMockData.createMotionParams.storageType,
      });

      // Redis 체크포인트 직접 저장 (이전 시도에서 AI 분석까지 성공한 상태 시뮬레이션)
      await motionRedisRepository.save(
        motion.id,
        motionMockData.mockAnalysisResult,
      );

      const analyzeSpy = jest
        .spyOn(analyzerClient, 'analyze')
        .mockResolvedValue(motionMockData.mockAnalysisResult);

      // attemptsMade = 1: 재시도 시나리오 (PROCESSING 상태 업데이트 스킵)
      await motionWorker.process(createMockJob(motion.id, 1));

      // 체크포인트 재사용 → AnalyzerClient 미호출
      expect(analyzeSpy).not.toHaveBeenCalled();

      // MongoDB 결과 저장 및 COMPLETED 전환 확인
      const completedMotion = await motionRepository.findWorkById(motion.id);
      expect(completedMotion.status).toBe(MotionStatus.COMPLETED);

      const analysisResult = await analysisService.findByMotionId(motion.id);
      expect(analysisResult).toBeDefined();
      expect(analysisResult.overallScore).toBe(
        motionMockData.mockAnalysisResult.overallScore,
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. 재시도 (retryEnqueue) 흐름
  // ──────────────────────────────────────────────────────────
  describe('재시도 (retryEnqueue) 흐름', () => {
    it('✅ FAILED → retryEnqueue → UPLOADED 복원 후 Worker 재처리 → COMPLETED', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      jest.spyOn(analyzerClient, 'analyze').mockRejectedValueOnce({
        code: 'AN_001',
        message: 'AI 분석 실패',
        retryable: false,
      });
      jest
        .spyOn(storageService, 'getDownloadUrl')
        .mockResolvedValue('http://localhost/test.mp4');

      const motion = await motionService.createAndEnqueue({
        userId: user.id,
        sportId: sport.id,
        videoKey: motionMockData.createMotionParams.videoKey,
        storageType: motionMockData.createMotionParams.storageType,
      });

      // 1차 처리 실패
      await expect(
        motionWorker.process(
          createMockJob(motion.id, MOTION_CONSTANTS.MAX_ATTEMPTS - 1),
        ),
      ).rejects.toThrow();

      let saved = await motionRepository.findWorkById(motion.id);
      expect(saved.status).toBe(MotionStatus.FAILED);

      // retryEnqueue → UPLOADED 상태 복원
      jest
        .spyOn(analyzerClient, 'analyze')
        .mockResolvedValue(motionMockData.mockAnalysisResult);

      await motionService.retryEnqueue(user.id, motion.id);

      saved = await motionRepository.findWorkById(motion.id);
      expect(saved.status).toBe(MotionStatus.UPLOADED);

      // 2차 처리 → COMPLETED
      await motionWorker.process(createMockJob(motion.id, 0));

      const completedMotion = await motionRepository.findWorkById(motion.id);
      expect(completedMotion.status).toBe(MotionStatus.COMPLETED);
    });

    it('❌ UPLOADED 상태 motion 재시도 시 DomainException(MOTION_RETRY_NOT_ALLOWED)', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      const motion = await motionService.createAndEnqueue({
        userId: user.id,
        sportId: sport.id,
        videoKey: motionMockData.createMotionParams.videoKey,
        storageType: motionMockData.createMotionParams.storageType,
      });

      await expect(
        motionService.retryEnqueue(user.id, motion.id),
      ).rejects.toThrow(DomainException);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. 목록 · 상세 조회 · 소유권 검사
  // ──────────────────────────────────────────────────────────
  describe('목록 · 상세 조회 · 소유권', () => {
    it('✅ getMotionList → 본인 motion만 반환 (pagination)', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      await motionService.createAndEnqueue({
        userId: user.id,
        sportId: sport.id,
        videoKey: 'u1/video-1.mp4',
        storageType: motionMockData.createMotionParams.storageType,
      });
      await motionService.createAndEnqueue({
        userId: user.id,
        sportId: sport.id,
        videoKey: 'u1/video-2.mp4',
        storageType: motionMockData.createMotionParams.storageType,
      });

      const { items, total } = await motionService.getMotionList(
        user.id,
        0,
        10,
      );

      expect(total).toBe(2);
      expect(items).toHaveLength(2);
    });

    it('❌ 타인 motion 상세 조회 시 DomainException(MOTION_NOT_FOUND)', async () => {
      const userA = await TestUserHelper.createUser(userMockData.validUser);
      const userB = await TestUserHelper.createUser(userMockData.anotherUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      const motion = await motionService.createAndEnqueue({
        userId: userA.id,
        sportId: sport.id,
        videoKey: motionMockData.createMotionParams.videoKey,
        storageType: motionMockData.createMotionParams.storageType,
      });

      // userB가 userA의 motion 조회 시도
      await expect(
        motionService.getMotionDetail(userB.id, motion.id),
      ).rejects.toThrow(DomainException);
    });

    it('❌ 존재하지 않는 motionId 조회 시 DomainException(MOTION_NOT_FOUND)', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);

      await expect(
        motionService.getMotionDetail(user.id, 999999),
      ).rejects.toThrow(DomainException);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. 비활성화 (soft delete)
  // ──────────────────────────────────────────────────────────
  describe('비활성화 (deactivate)', () => {
    it('✅ 본인 motion 비활성화 후 상세 조회 시 MOTION_NOT_FOUND', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      const motion = await motionService.createAndEnqueue({
        userId: user.id,
        sportId: sport.id,
        videoKey: motionMockData.createMotionParams.videoKey,
        storageType: motionMockData.createMotionParams.storageType,
      });

      await motionService.deactivate(user.id, motion.id);

      await expect(
        motionService.getMotionDetail(user.id, motion.id),
      ).rejects.toThrow(DomainException);
    });

    it('❌ 존재하지 않는 motion 비활성화 시 DomainException', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);

      await expect(motionService.deactivate(user.id, 999999)).rejects.toThrow(
        DomainException,
      );
    });

    it('❌ 타인 motion 비활성화 시 DomainException', async () => {
      const userA = await TestUserHelper.createUser(userMockData.validUser);
      const userB = await TestUserHelper.createUser(userMockData.anotherUser);
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      const motion = await motionService.createAndEnqueue({
        userId: userA.id,
        sportId: sport.id,
        videoKey: motionMockData.createMotionParams.videoKey,
        storageType: motionMockData.createMotionParams.storageType,
      });

      await expect(
        motionService.deactivate(userB.id, motion.id),
      ).rejects.toThrow(DomainException);
    });
  });
});
