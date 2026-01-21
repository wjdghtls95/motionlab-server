import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSportDto {
  @ApiProperty({
    description: '수정할 종목 설명',
    required: false, // 수정 시 선택 사항이라면
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
