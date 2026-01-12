import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserOutDto } from './dto/user-out.dto';
import { ApiResponseSpec } from '@common/decorators/api-response-spec.decorator';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';

@ApiTags('Users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiResponseSpec({
    summary: '사용자 생성',
    status: HttpStatus.CREATED,
    type: UserOutDto,
    errors: [DOMAIN_ERRORS.USER_ALREADY_EXISTS],
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserOutDto> {
    const user = await this.userService.create(createUserDto);

    return UserOutDto.of(user);
  }

  @Get()
  @ApiResponseSpec({
    summary: '모든 사용자 조회',
    type: UserOutDto,
    isArray: true, // 배열 응답
  })
  async findAll(): Promise<UserOutDto[]> {
    const users = await this.userService.findAll();

    return users.map((user) => UserOutDto.of(user));
  }

  @Get(':id')
  @ApiResponseSpec({
    summary: '사용자 조회',
    type: UserOutDto,
    errors: [DOMAIN_ERRORS.USER_NOT_FOUND],
  })
  async findOne(@Param('id') id: string): Promise<UserOutDto> {
    const user = await this.userService.findById(Number(id));

    return UserOutDto.of(user);
  }

  @Put(':id')
  @ApiResponseSpec({
    summary: '사용자 정보 수정',
    type: UserOutDto,
    errors: [DOMAIN_ERRORS.USER_NOT_FOUND],
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserOutDto> {
    const user = await this.userService.update(Number(id), updateUserDto);

    return UserOutDto.of(user);
  }

  @Delete(':id')
  @ApiResponseSpec({
    summary: '사용자 삭제',
    status: HttpStatus.OK, // 응답 본문 있음 (message)
    errors: [DOMAIN_ERRORS.USER_NOT_FOUND],
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.userService.remove(Number(id));
  }
}
