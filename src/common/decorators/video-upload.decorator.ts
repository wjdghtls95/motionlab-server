import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadMotionDto } from '@modules/motion/dto/upload-motion.dto';
import { VideoUploadInterceptor } from '@common/interceptors/video-upload.interceptor';

/**
 * 파일 업로드 공통 설정 데코레이터
 * - FileInterceptor + multipart 설정 통합
 * - DTO 기반 Swagger 스키마
 */
export function VideoUploadEndpoint() {
  return applyDecorators(
    UseInterceptors(VideoUploadInterceptor()),
    ApiConsumes('multipart/form-data'),
    ApiBody({ type: UploadMotionDto }),
  );
}
