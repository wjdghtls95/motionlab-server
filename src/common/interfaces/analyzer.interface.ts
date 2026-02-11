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
