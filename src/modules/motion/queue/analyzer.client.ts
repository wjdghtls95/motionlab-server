import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { BaseJobError, JOB_ERRORS } from '@common/constants/errors/job.errors';
import {
  AnalyzePayload,
  AnalyzeResponse,
} from '@common/interfaces/analyzer.interface';

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
  async analyze(
    analyzePayload: AnalyzePayload,
  ): Promise<{ result: any; feedback: any; promptVersion: string }> {
    this.logger.log({
      event: 'analyzer_request',
      motionId: analyzePayload.motionId,
      sportType: analyzePayload.sportType,
      subCategory: analyzePayload.subCategory,
      videoUrl: this.maskUrl(analyzePayload.videoUrl),
    });

    try {
      const requestBody = {
        motion_id: analyzePayload.motionId,
        sport_type: analyzePayload.sportType,
        sub_category: analyzePayload.subCategory,
        video_url: analyzePayload.videoUrl,
      };

      const res = await axios.post<AnalyzeResponse>(
        `${this.baseUrl}/analyze`,
        requestBody,
        {
          headers: {
            'X-Internal-API-Key': this.internalApiKey,
          },
          timeout: 60000,
        },
      );

      // 논리적 에러 처리 (HTTP 200이지만 success: false)
      if (!res.data.success) {
        const error: BaseJobError = {
          code: res.data.error_code || 'SYS_ANALYZER_LOGIC_FAIL',
          message: res.data.message || 'Analyzer returned failure',
          retryable: res.data.retryable ?? true,
          severity: res.data.retryable ? 'low' : 'high',
          status: res.status,
        };

        this.logger.warn({
          event: 'analyzer_logic_fail',
          motionId: analyzePayload.motionId,
          errorCode: error.code,
          message: error.message,
          retryable: error.retryable,
        });

        throw error;
      }

      this.logger.log({
        event: 'analyzer_success',
        motionId: analyzePayload.motionId,
        frames: res.data.result?.total_frames,
      });

      // 응답 데이터 매핑 (snake_case -> camelCase)
      return {
        result: res.data.result,
        feedback: res.data.feedback,
        promptVersion: res.data.prompt_version || 'unknown',
      };
    } catch (e) {
      const error = this.mapError(e);

      this.logger.error({
        event: 'analyzer_error',
        motionId: analyzePayload.motionId,
        errorCode: error.code,
        retryable: error.retryable,
        ...(process.env.NODE_ENV === 'development' && {
          stack: e instanceof Error ? e.stack : undefined,
        }),
      });
      throw error;
    }
  }

  /**
   * 에러 매핑 (Axios Error -> BaseJobError)
   */
  private mapError(e: unknown): BaseJobError {
    // 이미 BaseJobError로 변환된 경우
    if (this.isBaseJobError(e)) {
      return e as BaseJobError;
    }

    if (axios.isAxiosError(e)) {
      const err = e as AxiosError<AnalyzeResponse>;
      const status = err.response?.status;
      const data = err.response?.data;

      // Timeout
      if (err.code === 'ECONNABORTED') {
        return JOB_ERRORS.SYS_TIMEOUT;
      }

      // Analyzer가 명시적으로 반환한 에러 (body에 error_code 있음)
      if (data?.error_code) {
        return {
          code: data.error_code,
          message: data.message || err.message,
          retryable: data.retryable ?? true,
          // ⭐ 심각도 수정: Analyzer가 명시한 retryable 기반
          severity: data.retryable ? 'low' : 'high',
          status,
        };
      }

      // 서버 연결 불가 (네트워크 장애)
      if (!status) {
        return JOB_ERRORS.SYS_ANALYZER_UNREACHABLE;
      }

      // 5xx 에러 (서버 내부 오류)
      if (status >= 500) {
        return JOB_ERRORS.SYS_ANALYZER_5XX;
      }

      // 4xx 에러 (클라이언트 오류)
      if (status >= 400) {
        return {
          code: 'AN_VALIDATION_FAIL',
          message: data?.message || 'Client error',
          retryable: false,
          severity: 'low',
          status,
        };
      }
    }

    // 알 수 없는 에러
    return JOB_ERRORS.SYS_UNKNOWN;
  }

  /**
   * BaseJobError 타입 가드
   */
  private isBaseJobError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      'retryable' in err &&
      'message' in err
    );
  }

  /**
   * URL 마스킹 (로그 보안)
   */
  private maskUrl(url: string): string {
    // 1. HTTP/HTTPS URL이 아니면 로컬 경로로 간주
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // 경로가 너무 길면 끝부분만 표시
      const maxLength = 50;
      if (url.length > maxLength) {
        return `[LOCAL] ...${url.slice(-maxLength)}`;
      }
      return `[LOCAL] ${url}`;
    }

    // 2. URL 파싱 시도
    try {
      const urlObj = new URL(url);

      // 쿼리 파라미터가 있으면 마스킹
      if (urlObj.search) {
        return `${urlObj.origin}${urlObj.pathname}?[MASKED]`;
      }

      // 쿼리 파라미터 없으면 그대로 반환
      return url;
    } catch {
      // URL 파싱 실패 시
      return '[INVALID_URL]';
    }
  }
}
