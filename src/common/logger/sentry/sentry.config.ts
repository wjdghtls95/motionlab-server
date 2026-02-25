import * as Sentry from '@sentry/node';

/**
 * Sentry 에러 트래킹 설정
 *
 * - NestFactory.create() 이전에 초기화해야 앱 생성 중 발생하는 에러도 캡처 가능
 * - test 환경에서는 비활성화 (테스트 시 Sentry 이벤트 소비 방지)
 * - console.log 사용 이유: 이 시점에는 NestJS Logger(Winston)가 아직 존재하지 않음
 */
export class SentryConfig {
  /**
   * Sentry SDK 초기화
   * 호출 시점: main.ts → LoggerBootstrap.initSentry()
   */
  static init(): void {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
      console.warn('[Sentry] SENTRY_DSN not set, skipping initialization');
      return;
    }

    Sentry.init({
      dsn,

      // 환경 구분 (Sentry 대시보드에서 필터링 가능)
      environment: process.env.NODE_ENV || 'local',

      // Performance 트레이싱 샘플링 비율
      // production: 20% (무료 플랜 월 10,000건 한도 절약)
      // development: 100% (전체 추적)
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

      // 유저 IP, 쿠키 등 PII 전송 허용 (에러 디버깅에 유용)
      sendDefaultPii: true,

      // test 환경에서는 Sentry 비활성화
      // - test 환경에서 테스트해야될 때 enabled: true로 하고 테스트
      enabled: !['test', 'local'].includes(process.env.NODE_ENV || ''),
    });

    console.log(`[Sentry] Initialized (env: ${process.env.NODE_ENV})`);
  }
}
