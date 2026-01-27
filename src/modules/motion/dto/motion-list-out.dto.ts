import { ApiProperty } from '@nestjs/swagger';
import { BaseMotionOutDto } from '@modules/motion/dto/base-motion-out.dto';
import { BaseOutDto } from '@common/dto/base-out.dto';
import { SPORT_TYPES, SportType } from '@common/constants/sport-types.constant';

export class MotionListItemOutDto extends BaseMotionOutDto {
  @ApiProperty({ description: '운동 종목 ID' })
  sportId: number;

  @ApiProperty({
    enum: Object.values(SPORT_TYPES),
    nullable: true,
    description: '운동 종목 타입',
    example: 'golf',
  })
  sportType?: SportType;
}

export class MotionListOutDto extends BaseOutDto {
  @ApiProperty({ type: [MotionListItemOutDto] })
  items: MotionListItemOutDto[];

  @ApiProperty()
  pagination: {
    total: number;
    page: number; // skip 대신 page
    pageSize: number; // take 대신 pageSize
    totalPages: number;
  };
}
