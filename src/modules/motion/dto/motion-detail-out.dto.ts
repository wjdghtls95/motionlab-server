import { ApiProperty } from '@nestjs/swagger';
import { BaseMotionOutDto } from '@modules/motion/dto/base-motion-out.dto';
import { SportType } from '@common/constants/sport-types.constant';

export class MotionDetailOutDto extends BaseMotionOutDto {
  @ApiProperty()
  sport: { id: number; sportType: SportType };

  @ApiProperty({ nullable: true })
  error: {
    code: string;
    message: string;
  } | null;

  @ApiProperty({ nullable: true })
  result: any;

  @ApiProperty({ nullable: true })
  feedback: any;
}
