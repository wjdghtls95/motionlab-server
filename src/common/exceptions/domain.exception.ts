import { HttpException } from '@nestjs/common';
import {
  DomainError,
  ErrorSeverity,
} from '@common/constants/errors/domain.errors';

/**
 * 도메인(비즈니스) 예외
 */
export class DomainException extends HttpException {
  public readonly code: string;
  public readonly severity: ErrorSeverity;

  constructor(error: DomainError, customMessage?: string) {
    super(
      {
        code: error.code,
        message: customMessage || error.message,
      },
      error.status,
    );
    this.code = error.code;
    this.severity = ('severity' in error ? error.severity : undefined) ?? 'low';
  }
}
