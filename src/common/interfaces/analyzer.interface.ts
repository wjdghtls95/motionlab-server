// 요청 (NestJS -> FastAPI)
import {
  SportType,
  SubCategoryType,
} from '@common/constants/sport-types.constant';

export interface AnalyzePayload {
  motionId: number;
  sportType: SportType;
  subCategory?: SubCategoryType;
  videoUrl: string; // S3 URL 또는 로컬 경로
}

// 응답 (FastAPI -> NestJS)
export interface AnalyzeResponse {
  success: boolean;
  motion_id: number;

  // 성공 시
  result?: {
    total_frames: number;
    duration_seconds: number;
    angles: Record<string, number>;
    phases: Array<{ name: string; start_frame: number; end_frame: number }>;
    keypoints_sample: any[];
  };
  feedback?: string;
  prompt_version?: string;

  // 실패 시
  error_code?: string;
  message?: string;
  retryable?: boolean;
}

// 반환값 (Client -> Worker)
export interface AnalyzeResult {
  result: any;
  feedback: any;
  promptVersion: string;
}
