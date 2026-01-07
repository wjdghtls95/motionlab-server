import { ApiProperty } from '@nestjs/swagger';

export class PaginationOutDto<T> {
  @ApiProperty({ description: '항목 목록' })
  items: T[];

  @ApiProperty({ description: '전체 항목 수' })
  total: number;

  @ApiProperty({ description: '현재 페이지' })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수' })
  pageSize: number;

  @ApiProperty({ description: '전체 페이지 수' })
  totalPages: number;

  constructor(partial: Partial<PaginationOutDto<T>>) {
    Object.assign(this, partial);
  }
}
