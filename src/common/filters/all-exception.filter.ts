import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ThrottlerException } from '@nestjs/throttler';
import { DomainException } from '../exceptions/domain.exception';
import { SystemException } from '../exceptions/system.exception';
import { SENSITIVE_KEYWORDS } from '../constants/security.constants';
import { SYSTEM_ERRORS } from '../constants/errors/system.errors';
import { ERROR_SEVERITY } from '@common/constants/errors/error-severity';
import * as fs from 'fs/promises';
import { MulterError } from 'multer';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';
import * as nodePath from 'path';
import * as Sentry from '@sentry/node';

interface ErrorInfo {
  httpStatus: number;
  errorCode: string;
  message: string | object;
  isSystemError: boolean;
  cause: Error | null;
}

/**
 * 글로벌 예외 필터
 *
 * 핵심 기능:
 * 1. HTTP 상태 코드 기반 심각도 자동 판단
 * 2. 환경별 민감 정보 마스킹 (local/test는 비활성화)
 * 3. 표준 응답 형식 제공
 */
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // 실패시 Tmp 정리
    await this.cleanTmpFile(request);

    const errorInfo = this.resolveErrorInfo(exception);

    const responseBody = {
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      error: {
        code: errorInfo.errorCode,
        message: errorInfo.message,
      },
    };

    httpAdapter.reply(response, responseBody, errorInfo.httpStatus);

    this.logError(request, responseBody, errorInfo, exception);
  }

  /**
   * tmp 파일 정리
   * - 단일 업로드(request.file.path)만 처리
   * - tmp 하위만 삭제(안전장치)
   * - ENOENT(이미 없음)만 조용히 무시, 그 외는 warn 로그
   */
  private async cleanTmpFile(req: any): Promise<void> {
    const path = req?.file?.path;

    if (!path) return;

    const tmpRoot = nodePath.resolve(process.cwd(), 'tmp') + nodePath.sep;
    const resolved = nodePath.resolve(path);

    // tmp 밖 삭제 금지
    if (!resolved.startsWith(tmpRoot)) return;

    try {
      await fs.unlink(resolved);
    } catch (e) {
      // 이미 이동/삭제된 경우는 정상 케이스
      if (e?.code === 'ENOENT') return;

      // 그 외는 운영 이슈 신호일 수 있으니 warn
      this.logger.warn({
        event: 'tmp_cleanup_failed',
        path: resolved,
        code: e?.code,
        message: e?.message,
      });
    }
  }

  /**
   * 예외 타입 분석 및 심각도 판단
   * DomainException: HTTP 상태 코드 + severity 기반 판단
   * SystemException: 무조건 ERROR
   * HttpException: HTTP 상태 코드 기반 판단
   * Unknown: 무조건 ERROR
   */
  private resolveErrorInfo(exception: unknown): ErrorInfo {
    // ==================== 0. ThrottlerException (Rate Limit) ====================
    if (exception instanceof ThrottlerException) {
      return {
        httpStatus: HttpStatus.TOO_MANY_REQUESTS,
        errorCode: SYSTEM_ERRORS.SYS_TOO_MANY_REQUESTS.code,
        message: SYSTEM_ERRORS.SYS_TOO_MANY_REQUESTS.message,
        isSystemError: false, // 정상적인 제한 동작이므로 Sentry 전송 불필요
        cause: null,
      };
    }

    // ==================== 1. MulterError ====================
    if (exception instanceof MulterError) {
      return this.resolveMulterError(exception);
    }

    // ==================== 1. DomainException ====================
    if (exception instanceof DomainException) {
      const res = exception.getResponse() as any;
      const httpStatus = exception.getStatus();

      // severity 기반 동적 판단
      const isSystemError =
        httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR ||
        exception.severity === ERROR_SEVERITY.HIGH ||
        exception.severity === ERROR_SEVERITY.CRITICAL;

      return {
        httpStatus,
        errorCode: res.code,
        message: res.message,
        isSystemError,
        cause: null,
      };
    }

    // ==================== 2. SystemException ====================
    if (exception instanceof SystemException) {
      const res = exception.getResponse() as any;

      return {
        httpStatus: exception.getStatus(),
        errorCode: res.code,
        message: res.message,
        isSystemError: true, // 시스템 예외는 무조건 error
        cause: exception.cause,
      };
    }

    // ==================== 3. HttpException ====================
    if (exception instanceof HttpException) {
      const httpStatus = exception.getStatus();
      const res = exception.getResponse() as any;

      let errorCode = `HTTP_${httpStatus}`;
      let message = res.message || exception.message;

      // Validation 에러 특별 처리
      if (httpStatus === HttpStatus.BAD_REQUEST && Array.isArray(res.message)) {
        errorCode = 'VALIDATION_ERROR';
        message = {
          summary: '입력값이 올바르지 않습니다',
          errors: res.message,
        };
      }

      return {
        httpStatus,
        errorCode,
        message,
        isSystemError: httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR, // 자동 판단
        cause: null,
      };
    }

    // ==================== 4. Unknown Error ====================
    return {
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: SYSTEM_ERRORS.SYS_INTERNAL_SERVER_ERROR.code,
      message: SYSTEM_ERRORS.SYS_INTERNAL_SERVER_ERROR.message,
      isSystemError: true, // 무조건 error
      cause:
        exception instanceof Error ? exception : new Error(String(exception)),
    };
  }

  /**
   * MulterError -> DOMAIN_ERRORS 매핑
   * - 2중 if 대신 매핑 테이블로 가독성 확보
   */
  private resolveMulterError(exception: MulterError): ErrorInfo {
    const map: Record<
      string,
      { code: string; status: number; message: string }
    > = {
      LIMIT_FILE_SIZE: DOMAIN_ERRORS.FILE_TOO_LARGE,
      // 필요하면 여기에 추가
      // LIMIT_UNEXPECTED_FILE: DOMAIN_ERRORS.INVALID_FILE_TYPE,
    };

    const mapped = map[exception.code];

    if (mapped) {
      return {
        httpStatus: mapped.status,
        errorCode: mapped.code,
        message: mapped.message,
        isSystemError: false,
        cause: null,
      };
    }

    return {
      httpStatus: HttpStatus.BAD_REQUEST,
      errorCode: 'UPLOAD_ERROR',
      message: exception.message,
      isSystemError: false,
      cause: null,
    };
  }

  /**
   * 로깅 처리
   * - isSystemError에 따라 WARN vs ERROR 결정
   */
  private logError(
    request: any,
    responseBody: any,
    errorInfo: ErrorInfo,
    exception: unknown,
  ): void {
    const logInfo = {
      method: request.method,
      url: responseBody.path,
      statusCode: errorInfo.httpStatus,
      errorCode: errorInfo.errorCode,
      message: errorInfo.message,
      userId: request.user?.id ?? 'Anonymous',
      ip: request.ip,
      body: this.sanitizeBody(request.body),
    };

    if (errorInfo.isSystemError) {
      // Sentry에 시스템 에러 전송
      // errorInfo.cause가 있으면 원본 Error 객체 전송 (스택 트레이스 보존)
      // 없으면 catch의 exception 전송 (Unknown Error 등)
      Sentry.captureException(errorInfo.cause || exception, {
        tags: {
          errorCode: errorInfo.errorCode,
          httpStatus: String(errorInfo.httpStatus),
        },
        extra: { ...logInfo },
      });

      this.logger.error(logInfo, errorInfo.cause?.stack);
    } else {
      this.logger.warn(logInfo);
    }
  }

  /**
   * 민감 정보 마스킹 (환경별)
   * - local, test: 마스킹 비활성화 (디버깅 용이)
   * - dev, staging, prod: 마스킹 활성화 (보안 강화)
   */
  private sanitizeBody(body: any): any {
    // 환경별 마스킹 제어
    const env = process.env.NODE_ENV || 'development';
    const shouldMask = !['local', 'test'].includes(env);

    // local, test 환경에서는 원본 그대로 반환
    if (!shouldMask) {
      return body;
    }

    // dev, prod 환경에서는 마스킹 활성화
    if (!body) return body;

    if (Array.isArray(body)) {
      return body.map((item) => this.sanitizeBody(item));
    }

    if (typeof body === 'object' && body !== null) {
      const sanitized = { ...body };

      for (const key of Object.keys(sanitized)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_KEYWORDS.some((keyword) =>
          lowerKey.includes(keyword),
        );

        if (isSensitive) {
          sanitized[key] = '*****';
        } else {
          sanitized[key] = this.sanitizeBody(sanitized[key]);
        }
      }
      return sanitized;
    }

    return body;
  }
}
