import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { DomainException } from '../exceptions/domain.exception';
import { SystemException } from '../exceptions/system.exception';
import { SENSITIVE_KEYWORDS } from '../constants/security.constants';
import { SYSTEM_ERRORS } from '../constants/errors/system.errors';
import { ERROR_SEVERITY } from '@common/constants/errors/error-severity';

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

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

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
    this.logError(request, responseBody, errorInfo);
  }

  /**
   * 예외 타입 분석 및 심각도 판단
   * DomainException: HTTP 상태 코드 + severity 기반 판단
   * SystemException: 무조건 ERROR
   * HttpException: HTTP 상태 코드 기반 판단
   * Unknown: 무조건 ERROR
   */
  private resolveErrorInfo(exception: unknown): ErrorInfo {
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
   * 로깅 처리
   * - isSystemError에 따라 WARN vs ERROR 결정
   */
  private logError(
    request: any,
    responseBody: any,
    errorInfo: ErrorInfo,
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
