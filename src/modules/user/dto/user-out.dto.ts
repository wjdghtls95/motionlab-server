import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class UserOutDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @Exclude()
  password: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<UserOutDto>) {
    Object.assign(this, partial);
  }
}
