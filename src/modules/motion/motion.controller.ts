import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UploadedFile,
  ParseIntPipe,
  ValidationPipe,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { extname } from 'path';

import { StorageService } from '@modules/storage/storage.service';
import { AnalysisService } from '@modules/analysis/analysis.service';
import { UploadMotionDto } from './dto/upload-motion.dto';
import { MotionListQueryDto } from './dto/motion-list.query.dto';
import { VideoUploadEndpoint } from '@common/decorators/video-upload.decorator';
import { ApiResponseSpec } from '@common/decorators/api-response-spec.decorator';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';
import { MotionUploadOutDto } from '@modules/motion/dto/motion-upload-out.dto';
import {
  MotionListItemOutDto,
  MotionListOutDto,
} from '@modules/motion/dto/motion-list-out.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { User } from '@modules/user/entities/user.entity';
import { MotionDetailOutDto } from '@modules/motion/dto/motion-detail-out.dto';
import { MotionStatus } from '@common/constants/motion-status.enum';
import { MotionService } from '@modules/motion/motion.service';
import { Motion } from '@modules/motion/entities/motion.entity';

@Controller('motions')
export class MotionsController {
  constructor(
    private readonly motionService: MotionService,
    private readonly storageService: StorageService,
    private readonly analysisService: AnalysisService,
  ) {}

  // 시간당 20회 — 대용량 업로드 과도 방지
  @Throttle({ upload: {} })
  @Post('upload')
  @VideoUploadEndpoint()
  @ApiResponseSpec({
    summary: '운동 영상 업로드',
    description: '비동기 처리 - 업로드 후 즉시 motionId 반환 & BullMQ 큐 등록',
    type: MotionUploadOutDto,
    status: HttpStatus.CREATED,
    auth: true,
    errors: [
      DOMAIN_ERRORS.INVALID_FILE_TYPE,
      DOMAIN_ERRORS.FILE_TOO_LARGE,
      DOMAIN_ERRORS.SPORT_NOT_FOUND,
      DOMAIN_ERRORS.STORAGE_UPLOAD_FAILED,
    ],
  })
  async upload(
    @CurrentUser() user: User,
    @Body() uploadMotionDto: UploadMotionDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MotionUploadOutDto> {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const videoKey = `u${user.id}/${timestamp}-${random}${extname(
      file.originalname,
    )}`;

    const { storageType } = await this.storageService.storeUploadedFile({
      localPath: file.path,
      videoKey,
      contentType: file.mimetype,
    });

    let motion: Motion;
    try {
      motion = await this.motionService.createAndEnqueue({
        userId: user.id,
        sportId: uploadMotionDto.sportId,
        videoKey,
        storageType,
      });
    } catch (error) {
      await this.storageService.deleteByKey(videoKey).catch(() => undefined);
      throw error;
    }

    return MotionUploadOutDto.of({
      motionId: motion.id,
      status: motion.status,
      createAt: motion.createAt,
    });
  }

  @Post(':id/retry')
  @ApiResponseSpec({
    summary: '분석 재시도',
    description:
      'FAILED 상태의 motion을 다시 큐에 등록합니다. (jobId 중복은 제거 후 재등록)',
    status: HttpStatus.OK,
    auth: true,
    errors: [
      DOMAIN_ERRORS.MOTION_NOT_FOUND,
      DOMAIN_ERRORS.MOTION_RETRY_NOT_ALLOWED,
    ],
  })
  async retry(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MotionUploadOutDto> {
    const motion = await this.motionService.retryEnqueue(user.id, id);

    return MotionUploadOutDto.of({
      motionId: motion.id,
      status: motion.status,
      createAt: motion.createAt,
    });
  }

  @Get()
  @ApiResponseSpec({
    summary: '내 운동 영상 목록 조회',
    description: 'skip/take pagination + 안정 정렬',
    type: MotionListOutDto,
    auth: true,
  })
  async list(
    @CurrentUser() user: User,
    @Query(ValidationPipe) query: MotionListQueryDto,
  ) {
    const { items, total } = await this.motionService.getMotionList(
      user.id,
      query.skip,
      query.take,
      query.motionStatus,
    );

    return MotionListOutDto.of({
      items: items.map(MotionListItemOutDto.fromMotion),
      pagination: {
        total,
        page: query.page, // Query 값 그대로 사용
        pageSize: query.pageSize, // Query 값 그대로 사용
        totalPages: Math.ceil(total / query.pageSize), // 유일한 계산
      },
    });
  }

  @Get(':id')
  @ApiResponseSpec({
    summary: '운동 영상 상세 조회',
    description: 'MySQL 상태 + Mongo 분석 결과',
    type: MotionDetailOutDto,
    auth: true,
    errors: [DOMAIN_ERRORS.MOTION_NOT_FOUND],
  })
  async detail(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MotionDetailOutDto> {
    const motion = await this.motionService.getMotionDetail(user.id, id);

    let analysisResult = null;

    if (motion.status === MotionStatus.COMPLETED) {
      analysisResult = await this.analysisService.findByMotionId(id);
    }

    return MotionDetailOutDto.fromMotionAndAnalysis(motion, analysisResult);
  }

  @Delete(':id')
  @ApiResponseSpec({
    summary: '운동 영상 삭제(비활성화)',
    description:
      'isActive=false & deactivatedAt 기록 후 TTL cleanup에서 최종 삭제',
    status: HttpStatus.NO_CONTENT,
    auth: true,
    errors: [DOMAIN_ERRORS.MOTION_NOT_FOUND],
  })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.motionService.deactivate(user.id, id);
  }
}
