import { IsOptional, IsEnum } from 'class-validator';
import { MotionStatus } from '@common/constants/motion-status.enum';
import { PaginationDto } from '@common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MotionListQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: MotionStatus,
    description: '필터링할 상태 (optional)',
  })
  @IsOptional()
  @IsEnum(MotionStatus)
  motionStatus?: MotionStatus;
}
