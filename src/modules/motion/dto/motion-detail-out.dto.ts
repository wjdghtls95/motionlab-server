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
  result?: any;

  static fromMotionAndAnalysis(
    motion: Motion,
    analysisResult: any,
  ): MotionDetailOutDto {
    return MotionDetailOutDto.of({
      ...BaseMotionOutDto.extractBaseFields(motion),
      ...BaseMotionOutDto.extractAnalysisFields(analysisResult),

      // Detail 전용
      sport: {
        id: motion.sport.id,
        sportType: motion.sport.sportType,
      },
      result: analysisResult?.result ?? null,
    });
  }
}
