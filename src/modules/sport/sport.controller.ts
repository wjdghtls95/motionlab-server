import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SportService } from './sport.service';
import { SportOutDto } from './dto/sport-out.dto';
import { ApiResponseSpec } from '@common/decorators/api-response-spec.decorator';
import { UpdateSportDto } from '@modules/sport/dto/update-sport.dto';
import { CreateSportDto } from '@modules/sport/dto/create-sport.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/enums/user-role.enum';

@ApiTags('Sports')
@Controller('sports')
export class SportController {
  constructor(private readonly sportService: SportService) {}

  // 일반 유저 API
  @Get()
  @ApiResponseSpec({
    summary: '활성화된 모든 운동 종목 조회',
    type: SportOutDto,
    isArray: true,
    auth: true,
  })
  async findAll(): Promise<SportOutDto[]> {
    const sports = await this.sportService.findAll();
    return sports.map((sport) => SportOutDto.of(sport));
  }

  @Get(':id')
  @ApiResponseSpec({
    summary: '특정 운동 종목 조회',
    description: 'ID로 종목을 조회합니다.',
    type: SportOutDto,
    auth: true,
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<SportOutDto> {
    const sportOutDto = await this.sportService.findOne(Number(id));

    return sportOutDto;
  }

  // 관리자 전용 API
  // 향후 경로: POST /admin/sports

  /**
   * 운동 종목 생성
   *
   * POST /sports
   *
   * 관리자 서버로 이관 예정 (Phase 4)
   * 향후 경로: POST /admin/sports
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiResponseSpec({
    summary: '[관리자] 운동 종목 생성',
    description: '새로운 운동 종목을 생성합니다. (관리자 전용)',
    type: SportOutDto,
    auth: true,
  })
  async create(@Body() createSportDto: CreateSportDto): Promise<SportOutDto> {
    const sport = await this.sportService.create(createSportDto);

    return sport;
  }

  /**
   * 운동 종목 수정
   *
   * PATCH /sports/:id
   *
   * 관리자 서버로 이관 예정 (Phase 4)
   * 향후 경로: PATCH /admin/sports/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiResponseSpec({
    summary: '[관리자] 운동 종목 수정',
    description: '특정 운동 종목을 수정합니다. (관리자 전용)',
    type: SportOutDto,
    auth: true,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSportDto: UpdateSportDto,
  ): Promise<SportOutDto> {
    const sport = await this.sportService.update(id, updateSportDto);

    return SportOutDto.of(sport);
  }

  /**
   * 운동 종목 비활성화 (Soft Delete)
   *
   * DELETE /sports/:id
   *
   * 관리자 서버로 이관 예정 (Phase 4)
   * 향후 경로: DELETE /admin/sports/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiResponseSpec({
    summary: '[관리자] 운동 종목 비활성화',
    description: '특정 운동 종목을 비활성화합니다.',
    type: SportOutDto,
    auth: true,
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<SportOutDto> {
    const sportOutDto = await this.sportService.remove(id);

    return sportOutDto;
  }
}
