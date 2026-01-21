import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsIn,
} from 'class-validator';
import { SPORT_TYPES, SportType } from '@common/constants/sport-types.constant';

export class CreateSportDto {
  @ApiProperty({
    description: '운동 종목 타입',
    example: SPORT_TYPES.SOCCER,
    enum: Object.values(SPORT_TYPES),
  })
  @IsString()
  @IsNotEmpty({ message: '운동 종목 타입은 필수입니다.' })
  @MaxLength(50)
  @IsIn(Object.values(SPORT_TYPES), {
    message: `운동 종목 타입은 ${Object.values(SPORT_TYPES).join(
      ', ',
    )} 중 하나여야 합니다.`,
  })
  sportType: SportType;

  @ApiProperty({
    description: '운동 종목 설명',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
