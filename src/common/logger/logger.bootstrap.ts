import { LoggerService } from '@nestjs/common';
import { SentryConfig } from '@common/logger/sentry/sentry.config';
import { WinstonConfig } from '@common/logger/winston/winston.config';

export class LoggerBootstrap {
  /**
   * Sentry SDK 초기화
   * NestFactory.create() 이전에 호출해야 앱 생성 중 에러도 캡처됨
   */
  static initSentry(): void {
    SentryConfig.init();
  }

  /**
   * Winston 로거 생성
   * NestFactory.create()의 logger 옵션으로 전달
   */
  static createLogger(): LoggerService {
    return WinstonConfig.createLogger();
  }
}
