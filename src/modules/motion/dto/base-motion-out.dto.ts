import { BaseOutDto } from '@common/dto/base-out.dto';
import { ApiProperty } from '@nestjs/swagger';
import { MotionStatus } from '@common/constants/motion-status.enum';

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
}
