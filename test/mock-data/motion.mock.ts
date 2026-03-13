import { StorageType } from '@common/constants/storage-type.enum';
import { AnalyzedResultDto } from '@modules/motion/dto/analyzer-out.dto';

export const motionMockData = {
  /**
   * motion 생성 파라미터 (userId/sportId는 테스트마다 동적으로 주입)
   */
  createMotionParams: {
    videoKey: 'u1/1234567890-123456789.mp4',
    storageType: StorageType.LOCAL,
  },

  /**
   * FastAPI 분석 결과 mock (AnalyzerClient.analyze() 반환값)
   */
  mockAnalysisResult: {
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
  } as AnalyzedResultDto,
};
