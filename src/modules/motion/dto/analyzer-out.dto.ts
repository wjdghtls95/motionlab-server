import { ApiProperty } from '@nestjs/swagger';
import { BaseOutDto } from '@common/dto/base-out.dto';

// 하위 dto
export class AnalysisPhaseDto {
  @ApiProperty({ example: 'backswing' })
  name: string;

  @ApiProperty({ example: 76 })
  start_frame: number;

  @ApiProperty({ example: 83 })
  end_frame: number;

  @ApiProperty({ example: 241 })
  duration_ms: number;
}

export class AnalysisKeypointDto {
  @ApiProperty({ example: 0.6127 })
  x: number;

  @ApiProperty({ example: 0.3718 })
  y: number;

  @ApiProperty({ example: -0.6489 })
  z: number;

  @ApiProperty({ example: 0.9998 })
  visibility: number;
}

export class AnalysisImprovementDto {
  @ApiProperty({ example: '척추 각도가 이상 범위보다 낮습니다' })
  issue: string;

  @ApiProperty({ example: 117.1, required: false })
  current_value?: number;

  @ApiProperty({ example: [140.0, 170.0], required: false })
  ideal_range?: number[];

  @ApiProperty({ example: '스윙 시 척추를 더 곧게 유지하세요' })
  suggestion: string;
}

export class AnalysisResultDataDto {
  @ApiProperty({ example: 192 })
  total_frames: number;

  @ApiProperty({ example: 8 })
  duration_seconds: number;

  @ApiProperty({ example: { left_arm_angle: 153.2, spine_angle: 117.1 } })
  angles: Record<string, number>;

  @ApiProperty({ type: [AnalysisPhaseDto] })
  phases: AnalysisPhaseDto[];

  @ApiProperty({ type: [AnalysisKeypointDto] })
  keypoints_sample: AnalysisKeypointDto[];
}

// AI 서버 원본 응답 (snake_case)
export class AnalyzerRawResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  motion_id: number;

  @ApiProperty({ type: AnalysisResultDataDto })
  result: AnalysisResultDataDto;

  @ApiProperty({ example: '현재 스윙은 개선이 필요합니다.' })
  feedback: string;

  @ApiProperty({ example: 65 })
  overall_score: number;

  @ApiProperty({ type: [AnalysisImprovementDto] })
  improvements: AnalysisImprovementDto[];

  @ApiProperty({ example: 'ee25e11' })
  prompt_version: string;

  @ApiProperty({ required: false })
  error_code?: string;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ required: false })
  retryable?: boolean;
}

// NestJS 내부용 (camelCase)
export class AnalyzedResultDto extends BaseOutDto {
  @ApiProperty({ type: AnalysisResultDataDto })
  result: AnalysisResultDataDto;

  @ApiProperty({ example: '현재 스윙은 개선이 필요합니다.' })
  feedback: string;

  @ApiProperty({ example: 65 })
  overallScore: number;

  @ApiProperty({ type: [AnalysisImprovementDto] })
  improvements: AnalysisImprovementDto[];

  @ApiProperty({ example: 'ee25e11' })
  promptVersion: string;
}
