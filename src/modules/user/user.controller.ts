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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserOutDto } from './dto/user-out.dto';

@ApiTags('Users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: '사용자 생성' })
  @ApiResponse({
    status: 201,
    description: '사용자가 성공적으로 생성됨',
    type: UserOutDto,
  })
  @ApiResponse({ status: 409, description: '이메일이 이미 존재함' })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserOutDto> {
    const user = await this.userService.create(createUserDto);

    return new UserOutDto({ ...user });
  }

  @Get()
  @ApiOperation({ summary: '모든 사용자 조회' })
  @ApiResponse({
    status: 200,
    description: '사용자 목록',
    type: [UserOutDto],
  })
  async findAll() {
    const users = await this.userService.findAll();

    return users.map((user) => new UserOutDto({ ...user }));
  }

  @Get(':id')
  @ApiOperation({ summary: '사용자 조회 (ID)' })
  @ApiResponse({
    status: 200,
    description: '사용자 정보',
    type: UserOutDto,
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findById(Number(id));
    return new UserOutDto(user);
  }

  @Put(':id')
  @ApiOperation({ summary: '사용자 정보 수정' })
  @ApiResponse({
    status: 200,
    description: '사용자 정보가 수정됨',
    type: UserOutDto,
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.userService.update(Number(id), updateUserDto);

    return new UserOutDto({ ...user });
  }

  @Delete(':id')
  @ApiOperation({ summary: '사용자 삭제' })
  @ApiResponse({ status: 200, description: '사용자가 삭제됨' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async remove(@Param('id') id: string) {
    await this.userService.remove(Number(id));

    return { message: 'User deleted successfully' };
  }
}
