import { HttpException } from '@nestjs/common';
import { BaseSystemError } from '@common/constants/errors/system.errors';

/**
 * 시스템(인프라) 예외 클래스
 * - 서버 내부 문제 (DB, Redis, 외부 API 등)
 * - 무조건 ERROR 로그
 */
export class SystemException extends HttpException {
  public readonly code: string;
  public readonly cause: Error | null;

  constructor(
    error: BaseSystemError,
    public readonly contextOrCause?: Record<string, any> | Error,
  ) {
    // Error 인스턴스인지 확인
    const cause = contextOrCause instanceof Error ? contextOrCause : null;
    const context =
      contextOrCause instanceof Error ? undefined : contextOrCause;

    super(
      {
        code: error.code,
        message: error.message,
        ...(context && { context }), // context가 있을 때만 포함
      },
      error.status,
    );

    this.code = error.code;
    this.cause = cause ?? null;
    this.name = 'SystemException';
  }
}
