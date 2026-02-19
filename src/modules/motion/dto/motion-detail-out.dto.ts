import { ApiProperty } from '@nestjs/swagger';
import { BaseMotionOutDto } from '@modules/motion/dto/base-motion-out.dto';
import { SportType } from '@common/constants/sport-types.constant';
import { Motion } from '@modules/motion/entities/motion.entity';

export class MotionDetailOutDto extends BaseMotionOutDto {
  @ApiProperty()
  sport: { id: number; sportType: SportType };

  @ApiProperty({
    nullable: true,
    description: '분석 결과 상세 (angles, phases 등)',
  })
  result: any;

  static fromMotionAndAnalysis(
    motion: Motion,
    analysisResult: any,
  ): MotionDetailOutDto {
    return MotionDetailOutDto.of({
      // Base 필드
      id: motion.id,
      status: motion.status,
      createAt: motion.createAt,
      completedAt: motion.completedAt,
      errorCode: motion.errorCode,
      errorMessage: motion.errorMessage,
      overallScore: analysisResult?.overallScore ?? null,
      feedback: analysisResult?.feedback ?? null,
      improvements: analysisResult?.improvements ?? null,
      promptVersion: analysisResult?.promptVersion ?? null,
      // Detail 전용
      sport: {
        id: motion.sport.id,
        sportType: motion.sport.sportType,
      },
      result: analysisResult?.result ?? null,
    });
  }
}
