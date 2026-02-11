import {
  AnalysisImprovementDto,
  AnalysisResultDataDto,
} from '@app/modules/motion/dto/analyzer-out.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertAnalysisResultDto {
  @ApiProperty({ example: 1 })
  motionId: number;

  @ApiProperty({ type: AnalysisResultDataDto })
  result: AnalysisResultDataDto;

  @ApiProperty({ example: '현재 스윙은 개선이 필요합니다.' })
  feedback: string;

  @ApiProperty({ example: 65 })
  overallScore: number;

  @ApiProperty({ type: [AnalysisImprovementDto] })
  improvements: AnalysisImprovementDto[];

  @ApiProperty({ example: 'ee22eq3' })
  promptVersion: string;
}
