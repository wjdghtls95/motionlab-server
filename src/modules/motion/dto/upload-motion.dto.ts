import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class UploadMotionDto {
  @ApiProperty({
    description: '운동 종목 id',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  sportId: number;

  @ApiProperty({
    description: '운동 영상 파일 (mp4, mov, avi)',
    type: 'string',
    format: 'binary',
  })
  video: any;
}
