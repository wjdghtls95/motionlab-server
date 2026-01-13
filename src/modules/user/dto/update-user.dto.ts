import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: '홍길동', description: '이름' })
  @IsOptional()
  @IsString()
  name?: string;
}
