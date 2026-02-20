import { BaseOutDto } from '@common/dto/base-out.dto';
import { ApiProperty } from '@nestjs/swagger';
import { MotionStatus } from '@common/constants/motion-status.enum';
import { Motion } from '@modules/motion/entities/motion.entity';

/**
 * Motion 응답의 공통 필드 -> List, Detail에서 상속받아 중복 제거
 */
export abstract class BaseMotionOutDto extends BaseOutDto {
  @ApiProperty({ description: 'Motion id' })
  id: number;

  @ApiProperty({ enum: MotionStatus, description: '처리 상태' })
  status: MotionStatus;

  @ApiProperty({ description: '생성 시각' })
  createAt: Date;

  @ApiProperty({ nullable: true, description: '완료 시각' })
  completedAt?: Date;

  @ApiProperty({ nullable: true, description: '에러 코드' })
  errorCode?: string;

  @ApiProperty({ nullable: true, description: '에러 메시지' })
  errorMessage?: string;

  @ApiProperty({ nullable: true, description: 'AI 피드백' })
  feedback?: any;

  @ApiProperty({ nullable: true, description: '종합 점수' })
  overallScore?: number;

  @ApiProperty({ nullable: true, description: '개선사항 목록' })
  improvements?: any[];

  /**
   * Motion 엔티티에서 공통 필드 추출
   */
  static extractBaseFields(motion: Motion) {
    return {
      id: motion.id,
      status: motion.status,
      createAt: motion.createAt,
      completedAt: motion.completedAt,
      errorCode: motion.errorCode,
      errorMessage: motion.errorMessage,
    };
  }

  /**
   * 분석 결과에서 공통 필드 추출
   */
  static extractAnalysisFields(analysisResult: any) {
    return {
      overallScore: analysisResult?.overallScore ?? null,
      feedback: analysisResult?.feedback ?? null,
      improvements: analysisResult?.improvements ?? null,
    };
  }
}
