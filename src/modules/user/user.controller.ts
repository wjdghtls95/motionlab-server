import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserOutDto } from './dto/user-out.dto';
import { ApiResponseSpec } from '@common/decorators/api-response-spec.decorator';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';
import { DomainException } from '@common/exceptions/domain.exception';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/enums/user-role.enum';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiResponseSpec({
    summary: '[관리자] 모든 사용자 조회',
    type: UserOutDto,
    isArray: true,
    auth: true,
  })
  async findAll(): Promise<UserOutDto[]> {
    const users = await this.userService.findAll();

    return users.map((user) => UserOutDto.of(user));
  }

  @Get(':id')
  @ApiResponseSpec({
    summary: '사용자 조회(프로필)',
    type: UserOutDto,
    auth: true,
    errors: [DOMAIN_ERRORS.USER_NOT_FOUND, DOMAIN_ERRORS.AUTH_FORBIDDEN],
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<UserOutDto> {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== Number(id)) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_FORBIDDEN);
    }

    const user = await this.userService.findById(Number(id));

    return UserOutDto.of(user);
  }

  @Put(':id')
  @ApiResponseSpec({
    summary: '사용자 정보 수정',
    type: UserOutDto,
    auth: true,
    errors: [DOMAIN_ERRORS.USER_NOT_FOUND, DOMAIN_ERRORS.AUTH_FORBIDDEN],
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<UserOutDto> {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== Number(id)) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_FORBIDDEN);
    }

    const user = await this.userService.update(Number(id), updateUserDto);

    return UserOutDto.of(user);
  }

  @Delete(':id')
  @ApiResponseSpec({
    summary: '사용자 삭제',
    status: HttpStatus.OK,
    auth: true,
    errors: [DOMAIN_ERRORS.USER_NOT_FOUND, DOMAIN_ERRORS.AUTH_FORBIDDEN],
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<void> {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== Number(id)) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_FORBIDDEN);
    }

    await this.userService.remove(Number(id));
  }
}
