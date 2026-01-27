import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { BaseJobError, JOB_ERRORS } from '@common/constants/errors/job.errors';

@Injectable()
export class AnalyzerClient {
  private readonly logger = new Logger(AnalyzerClient.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>('ANALYZER_URL');
  }

  async analyze(payload: {
    motionId: number;
    sportCode: string;
    videoUrl: string;
  }): Promise<{ result: any; feedback: any; promptVersion: string }> {
    this.logger.log({
      event: 'analyzer_request',
      motionId: payload.motionId,
      sportCode: payload.sportCode,
    });

    try {
      const res = await axios.post(`${this.baseUrl}/analyze`, payload, {
        timeout: 60000,
      });

      return res.data;
    } catch (e) {
      const error = this.mapError(e);
      this.logger.error({
        event: 'analyzer_error',
        motionId: payload.motionId,
        errorCode: error.code,
        retryable: error.retryable,
      });
      throw error;
    }
  }

  private mapError(e: unknown): BaseJobError {
    if (!axios.isAxiosError(e)) return JOB_ERRORS.SYS_UNKNOWN;

    const err = e as AxiosError<any>;
    const status = err.response?.status;
    const data = err.response?.data;

    // Analyzer 표준 응답: { error_code, message, retryable }
    if (data?.error_code && data?.message) {
      return {
        code: data.error_code,
        message: data.message,
        retryable: Boolean(data.retryable),
        severity: data.retryable ? 'high' : 'low',
        status,
      };
    }

    // HTTP Status 기반 분류
    if (err.code === 'ECONNABORTED') return JOB_ERRORS.SYS_TIMEOUT;
    if (!status) return JOB_ERRORS.SYS_ANALYZER_UNREACHABLE;
    if (status >= 500) return JOB_ERRORS.SYS_ANALYZER_5XX;

    return JOB_ERRORS.AN_VALIDATION_FAIL;
  }
}
