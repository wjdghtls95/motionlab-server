import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AnalyzePayload } from '@common/interfaces/analyzer.interface';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';
import { maskUrlUtil } from '@common/utils/mask-url.util';
import { mapAxiosToJobError } from '@common/mappers/job-error.mapper';
import {
  AnalyzedResultDto,
  AnalyzerRawResponseDto,
} from '@modules/motion/dto/analyzer-out.dto';

@Injectable()
export class AnalyzerClient {
  private readonly logger = new Logger(AnalyzerClient.name);
  private readonly baseUrl: string;
  private readonly internalApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>('ANALYZER_URL');
    this.internalApiKey =
      this.configService.getOrThrow<string>('INTERNAL_API_KEY');
  }

  /**
   * Analyzer 서버에 분석 요청
   */
  async analyze(analyzePayload: AnalyzePayload): Promise<AnalyzedResultDto> {
    const { motionId, sportType, subCategory, videoUrl } = analyzePayload;

    this.logger.log({
      event: 'analyzer_request',
      motionId: motionId,
      sportType: sportType.toUpperCase(),
      subCategory: subCategory,
      videoUrl: maskUrlUtil(videoUrl),
    });

    try {
      const requestBody = {
        motion_id: analyzePayload.motionId,
        sport_type: analyzePayload.sportType.toUpperCase(),
        sub_category: analyzePayload.subCategory,
        video_url: analyzePayload.videoUrl,
      };

      const res = await axios.post<AnalyzerRawResponseDto>(
        `${this.baseUrl}/analyze`,
        requestBody,
        {
          headers: {
            'X-Internal-API-Key': this.internalApiKey,
          },
          timeout: MOTION_CONSTANTS.ANALYZER_TIMEOUT,
        },
      );

      // 논리적 에러 처리 (HTTP 200이지만 success: false)
      if (!res.data.success) {
        throw mapAxiosToJobError({
          code: res.data.error_code,
          message: res.data.message,
          retryable: res.data.retryable ?? true,
        });
      }

      this.logger.log({
        event: 'analyzer_success',
        motionId,
        frames: res.data.result?.total_frames,
      });

      // 응답 데이터 매핑 (snake_case -> camelCase)
      return AnalyzedResultDto.of({
        result: res.data.result,
        feedback: res.data.feedback,
        overallScore: res.data.overall_score,
        improvements: res.data.improvements || [],
        promptVersion: res.data.prompt_version,
      });
    } catch (e) {
      throw mapAxiosToJobError(e);
    }
  }
}
