import { HttpException } from '@nestjs/common';
import { SystemError } from '@common/constants/errors/system.errors';

export class SystemException extends HttpException {
  public readonly code: string;
  public readonly cause: Error | null;

  constructor(error: SystemError, cause?: Error) {
    super(
      {
        code: error.code,
        message: error.message,
      },
      error.status,
    );
    this.code = error.code;
    this.cause = cause ?? null;
  }
}
