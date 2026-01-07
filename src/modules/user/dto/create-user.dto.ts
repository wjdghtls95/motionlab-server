import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail({ message: '유효한 이메일 주소를 입력해주세요' })
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호 (최소 6자)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '홍길동', description: '이름' })
  @IsOptional()
  @IsString()
  name?: string;
}
