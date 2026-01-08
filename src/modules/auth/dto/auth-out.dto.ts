import { ApiProperty } from '@nestjs/swagger';

export class AuthOutDto {
  @ApiProperty({
    description: 'JWT 액세스 토큰',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '사용자 ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: '이메일',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: '이름',
    example: '홍길동',
    required: false,
  })
  name?: string;

  constructor(partial: Partial<AuthOutDto>) {
    Object.assign(this, partial);
  }
}
