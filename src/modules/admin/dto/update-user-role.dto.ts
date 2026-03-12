import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '@common/enums/user-role.enum';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole, description: '변경할 사용자 역할' })
  @IsEnum(UserRole)
  role: UserRole;
}
