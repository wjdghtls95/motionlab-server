import { TestingModule } from '@nestjs/testing';

import { getTestModule } from '../test-helper/get-test-module';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestMongoHelper } from '../test-helper/test-mongo.helper';
import { TestQueueHelper } from '../test-helper/test-queue.helper';

import { AnalysisService } from '@modules/analysis/analysis.service';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';

describe('AnalysisService (MongoDB Integration)', () => {
  let module: TestingModule;
  let analysisService: AnalysisService;

  const baseParams = {
    motionId: 1,
    result: {
      total_frames: 192,
      duration_seconds: 8,
      angles: { left_arm_angle: 153.2, spine_angle: 117.1 },
      phases: [
        { name: 'backswing', start_frame: 76, end_frame: 83, duration_ms: 241 },
      ],
      keypoints_sample: [],
    },
    feedback: '현재 스윙은 개선이 필요합니다.',
    overallScore: 65,
    improvements: [
      {
        issue: '척추 각도가 이상 범위보다 낮습니다',
        current_value: 117.1,
        ideal_range: [140.0, 170.0],
        suggestion: '스윙 시 척추를 더 곧게 유지하세요',
      },
    ],
    promptVersion: 'ee25e11',
  };

  beforeAll(async () => {
    module = await getTestModule;
    analysisService = module.get<AnalysisService>(AnalysisService);

    await TestDatabaseHelper.initialize(module);
    TestMongoHelper.initialize(module);
    TestQueueHelper.initialize(module);
  });

  beforeEach(async () => {
    await TestMongoHelper.clearAll();
  });

  afterAll(async () => {
    await TestQueueHelper.clear(MOTION_CONSTANTS.QUEUE_NAME);
    await TestDatabaseHelper.close();
    if (module) await module.close();
  });

  // ──────────────────────────────────────────────────────────
  // upsertResult
  // ──────────────────────────────────────────────────────────
  describe('upsertResult', () => {
    it('✅ 분석 결과를 MongoDB에 저장한다', async () => {
      await analysisService.upsertResult(baseParams);

      const saved = await analysisService.findByMotionId(baseParams.motionId);

      expect(saved).toBeDefined();
      expect(saved.motionId).toBe(baseParams.motionId);
      expect(saved.overallScore).toBe(baseParams.overallScore);
      expect(saved.feedback).toBe(baseParams.feedback);
      expect(saved.promptVersion).toBe(baseParams.promptVersion);
    });

    it('✅ 동일 motionId 재저장 시 덮어쓴다 (upsert)', async () => {
      await analysisService.upsertResult(baseParams);

      const updatedParams = {
        ...baseParams,
        overallScore: 80,
        promptVersion: 'v2.0',
      };
      await analysisService.upsertResult(updatedParams);

      const result = await analysisService.findByMotionId(baseParams.motionId);

      // 2회 저장이지만 문서 1개 (upsert)
      expect(result.overallScore).toBe(80);
      expect(result.promptVersion).toBe('v2.0');
    });

    it('✅ improvements가 빈 배열이어도 저장된다', async () => {
      await analysisService.upsertResult({
        ...baseParams,
        improvements: [],
      });

      const result = await analysisService.findByMotionId(baseParams.motionId);

      expect(result.improvements).toEqual([]);
    });

    it('✅ 서로 다른 motionId는 독립적으로 저장된다', async () => {
      await analysisService.upsertResult({ ...baseParams, motionId: 1 });
      await analysisService.upsertResult({
        ...baseParams,
        motionId: 2,
        overallScore: 90,
      });

      const result1 = await analysisService.findByMotionId(1);
      const result2 = await analysisService.findByMotionId(2);

      expect(result1.overallScore).toBe(65);
      expect(result2.overallScore).toBe(90);
    });

    it('✅ overallScore 0점도 정상 저장된다 (falsy 값 처리)', async () => {
      await analysisService.upsertResult({ ...baseParams, overallScore: 0 });

      const result = await analysisService.findByMotionId(baseParams.motionId);

      expect(result.overallScore).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────
  // findByMotionId
  // ──────────────────────────────────────────────────────────
  describe('findByMotionId', () => {
    it('✅ 저장된 결과를 motionId로 조회한다', async () => {
      await analysisService.upsertResult(baseParams);

      const result = await analysisService.findByMotionId(baseParams.motionId);

      expect(result).not.toBeNull();
      expect(result.motionId).toBe(baseParams.motionId);
    });

    it('✅ 존재하지 않는 motionId 조회 시 null 반환', async () => {
      const result = await analysisService.findByMotionId(999999);

      expect(result).toBeNull();
    });

    it('✅ 조회 결과에 improvements 배열이 포함된다', async () => {
      await analysisService.upsertResult(baseParams);

      const result = await analysisService.findByMotionId(baseParams.motionId);

      expect(Array.isArray(result.improvements)).toBe(true);
      expect(result.improvements[0]).toMatchObject({
        issue: '척추 각도가 이상 범위보다 낮습니다',
      });
    });

    it('✅ 조회 결과에 result(pose 데이터)가 포함된다', async () => {
      await analysisService.upsertResult(baseParams);

      const result = await analysisService.findByMotionId(baseParams.motionId);

      expect(result.result).toBeDefined();
      expect(result.result.total_frames).toBe(192);
      expect(result.result.angles).toMatchObject({
        left_arm_angle: 153.2,
      });
    });
  });
});
