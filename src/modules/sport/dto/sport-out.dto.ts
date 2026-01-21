import { BaseOutDto } from '@common/dto/base-out.dto';
import { ApiProperty } from '@nestjs/swagger';
import { SPORT_TYPES, SportType } from '@common/constants/sport-types.constant';

export class SportOutDto extends BaseOutDto {
  @ApiProperty({ description: '운동 종목 ID' })
  id: number;

  @ApiProperty({
    description: '운동 종목 타입',
    example: SPORT_TYPES.SOCCER,
    enum: Object.values(SPORT_TYPES),
  })
  sportType: SportType;

  @ApiProperty({
    description: '운동 종목 설명',
    required: false,
  })
  description?: string;
}
