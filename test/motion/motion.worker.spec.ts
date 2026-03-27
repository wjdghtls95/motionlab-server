import { MotionWorker } from '@modules/motion/queue/motion.worker';
import { MotionService } from '@modules/motion/motion.service';
import { AnalyzerClient } from '@modules/motion/queue/analyzer.client';
import { AnalysisService } from '@modules/analysis/analysis.service';
import { StorageService } from '@modules/storage/storage.service';
import { MotionRedisRepository } from '@modules/motion/caches/motion-redis.repository';
import { MotionStatus } from '@common/constants/motion-status.enum';
import { JOB_ERRORS } from '@common/constants/errors/job.errors';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';
import { Job } from 'bullmq';

// ──────────────────────────────────────────
// 의존성 mock 팩토리
// ──────────────────────────────────────────

const mockMotionService = () => ({
  getMotionForWork: jest.fn(),
  updateStatus: jest.fn(),
  updateStatusWithError: jest.fn(),
  completeWithScore: jest.fn(),
});

const mockAnalyzerClient = () => ({
  analyze: jest.fn(),
});

const mockAnalysisService = () => ({
  upsertResult: jest.fn(),
});

const mockStorageService = () => ({
  getDownloadUrl: jest.fn(),
});

const mockMotionRedisRepository = () => ({
  get: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

// ──────────────────────────────────────────
// Job mock 빌더
// ──────────────────────────────────────────

const buildJob = (overrides: Partial<Job> = {}): Job =>
  ({
    name: MOTION_CONSTANTS.JOB_NAME,
    id: 'test-job-id',
    data: { motionId: 1 },
    attemptsMade: 0,
    discard: jest.fn(),
    ...overrides,
  } as unknown as Job);

// ──────────────────────────────────────────
// Motion mock 빌더
// ──────────────────────────────────────────

const buildMotion = (status: MotionStatus = MotionStatus.UPLOADED) => ({
  id: 1,
  status,
  videoKey: 'videos/test.mp4',
  sport: { sportType: 'golf', subCategory: 'driver' },
});

// ──────────────────────────────────────────
// 분석 결과 fixture
// ──────────────────────────────────────────

const analysisResult = {
  overallScore: 85,
  feedback: 'Good swing',
  improvements: [],
  result: {},
  promptVersion: '1.0',
};

// ──────────────────────────────────────────
// 테스트
// ──────────────────────────────────────────

describe('MotionWorker', () => {
  let worker: MotionWorker;
  let motionService: ReturnType<typeof mockMotionService>;
  let analyzerClient: ReturnType<typeof mockAnalyzerClient>;
  let analysisService: ReturnType<typeof mockAnalysisService>;
  let storageService: ReturnType<typeof mockStorageService>;
  let motionRedisRepository: ReturnType<typeof mockMotionRedisRepository>;

  beforeEach(() => {
    motionService = mockMotionService();
    analyzerClient = mockAnalyzerClient();
    analysisService = mockAnalysisService();
    storageService = mockStorageService();
    motionRedisRepository = mockMotionRedisRepository();

    worker = new MotionWorker(
      motionService as unknown as MotionService,
      analyzerClient as unknown as AnalyzerClient,
      analysisService as unknown as AnalysisService,
      storageService as unknown as StorageService,
      motionRedisRepository as unknown as MotionRedisRepository,
    );
  });

  // 테스트 환경에서 NestJS Logger 콘솔 출력 억제
  beforeAll(() => {
    jest
      .spyOn(console, 'error')
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .mockImplementation((_msg?: unknown) => {});
    jest
      .spyOn(console, 'log')
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .mockImplementation((_msg?: unknown) => {});
    jest
      .spyOn(console, 'warn')
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .mockImplementation((_msg?: unknown) => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────
  // 1. 잡 이름 불일치 → 즉시 반환
  // ─────────────────────────────────────────

  describe('잡 이름 검사', () => {
    it('✅ 잡 이름이 다르면 아무것도 실행하지 않고 반환한다', async () => {
      const job = buildJob({ name: 'wrong-job-name' });

      await expect(worker.process(job)).resolves.toBeUndefined();

      expect(motionService.getMotionForWork).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────
  // 2. motionId 검증 실패 → 즉시 실패
  // ─────────────────────────────────────────

  describe('motionId 검증 (R-080)', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['문자열', 'abc'],
      ['0', 0],
      ['음수', -1],
    ])(
      '❌ motionId가 %s이면 DB를 호출하지 않고 job.discard() 후 throw한다',
      async (_label, invalidId) => {
        const job = buildJob({ data: { motionId: invalidId } } as any);

        await expect(worker.process(job)).rejects.toThrow();

        expect(motionService.getMotionForWork).not.toHaveBeenCalled();
        expect(job.discard).toHaveBeenCalled();
      },
    );

    it('✅ motionId가 유효한 양의 정수이면 정상 처리를 계속한다', async () => {
      const job = buildJob({ data: { motionId: 42 } } as any);
      motionService.getMotionForWork.mockResolvedValue(
        buildMotion(MotionStatus.COMPLETED),
      );

      await worker.process(job);

      expect(motionService.getMotionForWork).toHaveBeenCalledWith(42);
    });
  });

  // ─────────────────────────────────────────
  // 3. 이미 COMPLETED → 스킵
  // ─────────────────────────────────────────

  describe('COMPLETED 상태 스킵', () => {
    it('✅ motion이 이미 COMPLETED 상태이면 분석을 건너뛴다', async () => {
      const job = buildJob();
      motionService.getMotionForWork.mockResolvedValue(
        buildMotion(MotionStatus.COMPLETED),
      );

      await worker.process(job);

      expect(analyzerClient.analyze).not.toHaveBeenCalled();
      expect(motionService.updateStatus).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────
  // 3. 정상 분석 완료
  // ─────────────────────────────────────────

  describe('정상 분석 완료', () => {
    it('✅ 첫 시도 성공 시 COMPLETED로 전환되고 Redis cache를 삭제한다', async () => {
      const job = buildJob();
      motionService.getMotionForWork.mockResolvedValue(buildMotion());
      motionService.updateStatus.mockResolvedValue(undefined);
      motionRedisRepository.get.mockResolvedValue(null);
      storageService.getDownloadUrl.mockResolvedValue(
        'https://r2.example.com/video.mp4',
      );
      analyzerClient.analyze.mockResolvedValue(analysisResult);
      motionRedisRepository.save.mockResolvedValue(undefined);
      analysisService.upsertResult.mockResolvedValue(undefined);
      motionService.completeWithScore.mockResolvedValue(undefined);
      motionRedisRepository.delete.mockResolvedValue(undefined);

      await worker.process(job);

      expect(motionService.updateStatus).toHaveBeenCalledWith(
        1,
        MotionStatus.PROCESSING,
      );
      expect(analyzerClient.analyze).toHaveBeenCalledWith({
        motionId: 1,
        sportType: 'golf',
        subCategory: 'driver',
        videoUrl: 'https://r2.example.com/video.mp4',
      });
      expect(motionService.completeWithScore).toHaveBeenCalledWith(1, 85);
      expect(motionRedisRepository.delete).toHaveBeenCalledWith(1);
    });

    it('✅ Redis checkpoint가 있으면 FastAPI를 호출하지 않고 체크포인트로 복구한다', async () => {
      const job = buildJob({ attemptsMade: 1 } as any);
      motionService.getMotionForWork.mockResolvedValue(buildMotion());
      motionRedisRepository.get.mockResolvedValue(analysisResult);
      analysisService.upsertResult.mockResolvedValue(undefined);
      motionService.completeWithScore.mockResolvedValue(undefined);
      motionRedisRepository.delete.mockResolvedValue(undefined);

      await worker.process(job);

      expect(analyzerClient.analyze).not.toHaveBeenCalled();
      expect(motionService.completeWithScore).toHaveBeenCalledWith(1, 85);
    });
  });

  // ─────────────────────────────────────────
  // 4. getMotionForWork 실패 → FAILED (핵심 버그 수정 검증)
  // ─────────────────────────────────────────

  describe('getMotionForWork DB 접근 실패 (R-042 핵심 버그 수정)', () => {
    it('❌ getMotionForWork가 실패하면 FAILED로 전환하고 에러를 throw한다', async () => {
      const job = buildJob({
        attemptsMade: MOTION_CONSTANTS.MAX_ATTEMPTS - 1,
      } as any);
      motionService.getMotionForWork.mockRejectedValue(
        new Error('DB connection lost'),
      );
      motionService.updateStatusWithError.mockResolvedValue(undefined);

      await expect(worker.process(job)).rejects.toThrow();

      // DB 접근 실패가 try 안에서 처리되어 FAILED로 전환되어야 함
      expect(motionService.updateStatusWithError).toHaveBeenCalledWith(
        1,
        MotionStatus.FAILED,
        expect.any(Object),
      );
    });

    it('❌ getMotionForWork 실패 + 아직 재시도 남음 → RETRYING으로 전환하고 rethrow한다', async () => {
      const job = buildJob({ attemptsMade: 0 } as any);
      motionService.getMotionForWork.mockRejectedValue(
        new Error('DB connection lost'),
      );
      motionService.updateStatusWithError.mockResolvedValue(undefined);

      await expect(worker.process(job)).rejects.toThrow();

      expect(motionService.updateStatusWithError).toHaveBeenCalledWith(
        1,
        MotionStatus.RETRYING,
        expect.any(Object),
      );
    });
  });

  // ─────────────────────────────────────────
  // 5. 재시도 가능 에러 (analyzerClient 실패)
  // ─────────────────────────────────────────

  describe('재시도 가능 에러 처리', () => {
    it('❌ 재시도 가능 에러 + 재시도 남음 → RETRYING으로 전환하고 rethrow한다', async () => {
      const job = buildJob({ attemptsMade: 0 } as any);
      motionService.getMotionForWork.mockResolvedValue(buildMotion());
      motionService.updateStatus.mockResolvedValue(undefined);
      motionRedisRepository.get.mockResolvedValue(null);
      storageService.getDownloadUrl.mockResolvedValue(
        'https://r2.example.com/video.mp4',
      );
      analyzerClient.analyze.mockRejectedValue(JOB_ERRORS.SYS_TIMEOUT);
      motionService.updateStatusWithError.mockResolvedValue(undefined);

      // RETRYING 경로는 throw err로 plain object(JOB_ERRORS)를 rethrow하므로
      // rejects.toBeDefined()로 rejection 여부를 확인
      await expect(worker.process(job)).rejects.toBeDefined();

      expect(motionService.updateStatusWithError).toHaveBeenCalledWith(
        1,
        MotionStatus.RETRYING,
        JOB_ERRORS.SYS_TIMEOUT,
      );
    });

    it('❌ 재시도 가능 에러 + 마지막 시도 → FAILED로 전환한다', async () => {
      const job = buildJob({
        attemptsMade: MOTION_CONSTANTS.MAX_ATTEMPTS - 1,
      } as any);
      motionService.getMotionForWork.mockResolvedValue(buildMotion());
      motionService.updateStatus.mockResolvedValue(undefined);
      motionRedisRepository.get.mockResolvedValue(null);
      storageService.getDownloadUrl.mockResolvedValue(
        'https://r2.example.com/video.mp4',
      );
      analyzerClient.analyze.mockRejectedValue(JOB_ERRORS.SYS_TIMEOUT);
      motionService.updateStatusWithError.mockResolvedValue(undefined);

      await expect(worker.process(job)).rejects.toThrow();

      expect(motionService.updateStatusWithError).toHaveBeenCalledWith(
        1,
        MotionStatus.FAILED,
        JOB_ERRORS.SYS_TIMEOUT,
      );
    });
  });

  // ─────────────────────────────────────────
  // 6. 재시도 불가 에러
  // ─────────────────────────────────────────

  describe('재시도 불가 에러 처리', () => {
    it('❌ 재시도 불가 에러 → 즉시 FAILED + job.discard() 호출', async () => {
      const job = buildJob({ attemptsMade: 0 } as any);
      motionService.getMotionForWork.mockResolvedValue(buildMotion());
      motionService.updateStatus.mockResolvedValue(undefined);
      motionRedisRepository.get.mockResolvedValue(null);
      storageService.getDownloadUrl.mockResolvedValue(
        'https://r2.example.com/video.mp4',
      );
      analyzerClient.analyze.mockRejectedValue(JOB_ERRORS.AN_NO_KEYPOINTS);
      motionService.updateStatusWithError.mockResolvedValue(undefined);

      await expect(worker.process(job)).rejects.toThrow();

      expect(motionService.updateStatusWithError).toHaveBeenCalledWith(
        1,
        MotionStatus.FAILED,
        JOB_ERRORS.AN_NO_KEYPOINTS,
      );
      expect(job.discard).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────
  // 7. updateStatusWithError 자체 실패 (안전망 검증)
  // handleJobError를 직접 호출하여 status 업데이트 실패 시에도
  // throw를 유지하는지 확인한다
  // ─────────────────────────────────────────

  describe('updateStatusWithError DB 실패 시 안전망', () => {
    it('❌ FAILED path: updateStatusWithError가 실패해도 handleJobError는 여전히 throw한다', async () => {
      const job = buildJob({
        attemptsMade: MOTION_CONSTANTS.MAX_ATTEMPTS - 1,
      } as any);
      motionService.updateStatusWithError.mockRejectedValue(
        new Error('DB write failed'),
      );

      await expect(
        (worker as any).handleJobError(job, 1, JOB_ERRORS.SYS_TIMEOUT),
      ).rejects.toBeDefined();

      expect(motionService.updateStatusWithError).toHaveBeenCalledWith(
        1,
        MotionStatus.FAILED,
        JOB_ERRORS.SYS_TIMEOUT,
      );
    });

    it('❌ RETRYING path: updateStatusWithError가 실패해도 handleJobError는 여전히 throw한다', async () => {
      const job = buildJob({ attemptsMade: 0 } as any);
      motionService.updateStatusWithError.mockRejectedValue(
        new Error('DB write failed'),
      );

      await expect(
        (worker as any).handleJobError(job, 1, JOB_ERRORS.SYS_TIMEOUT),
      ).rejects.toBeDefined();

      expect(motionService.updateStatusWithError).toHaveBeenCalledWith(
        1,
        MotionStatus.RETRYING,
        JOB_ERRORS.SYS_TIMEOUT,
      );
    });
  });
});
