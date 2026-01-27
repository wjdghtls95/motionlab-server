import { BaseOutDto } from '@common/dto/base-out.dto';
import { ApiProperty } from '@nestjs/swagger';
import { MotionStatus } from '@common/constants/motion-status.enum';

export class MotionUploadOutDto extends BaseOutDto {
  @ApiProperty({ description: '생성된 Motion ID', example: 123 })
  motionId: number;

  @ApiProperty({ description: '초기 상태', enum: MotionStatus })
  status: MotionStatus;

  @ApiProperty()
  createAt: Date;
}
