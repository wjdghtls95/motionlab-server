import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserOutDto } from '@modules/user/dto/user-out.dto';
import { ApiResponseSpec } from '@common/decorators/api-response-spec.decorator';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/enums/user-role.enum';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 사용자 역할 변경
   *
   * PATCH /admin/users/:id/role
   */
  @Patch('users/:id/role')
  @ApiResponseSpec({
    summary: '[관리자] 사용자 역할 변경',
    description: '특정 사용자의 역할을 변경합니다. (관리자 전용)',
    type: UserOutDto,
    auth: true,
    errors: [DOMAIN_ERRORS.USER_NOT_FOUND, DOMAIN_ERRORS.AUTH_FORBIDDEN],
  })
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<UserOutDto> {
    return this.adminService.updateUserRole(id, updateUserRoleDto);
  }
}
