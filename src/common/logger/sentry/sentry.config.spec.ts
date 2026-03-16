import * as Sentry from '@sentry/node';
import { SentryConfig } from './sentry.config';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
}));

const mockSentryInit = Sentry.init as jest.Mock;

describe('SentryConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    mockSentryInit.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('SENTRY_DSN 미설정', () => {
    it('✅ DSN 없으면 Sentry.init 호출 없이 스킵', () => {
      delete process.env.SENTRY_DSN;
      SentryConfig.init();
      expect(mockSentryInit).not.toHaveBeenCalled();
    });
  });

  describe('sendDefaultPii', () => {
    it('✅ sendDefaultPii가 반드시 false여야 함 (개인정보보호법)', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.NODE_ENV = 'production';

      SentryConfig.init();

      const initOptions = mockSentryInit.mock.calls[0][0];
      expect(initOptions.sendDefaultPii).toBe(false);
    });

    it('✅ 개발 환경에서도 sendDefaultPii false 유지', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.NODE_ENV = 'development';

      SentryConfig.init();

      const initOptions = mockSentryInit.mock.calls[0][0];
      expect(initOptions.sendDefaultPii).toBe(false);
    });
  });

  describe('enabled', () => {
    it('✅ test 환경에서 비활성화', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.NODE_ENV = 'test';

      SentryConfig.init();

      const initOptions = mockSentryInit.mock.calls[0][0];
      expect(initOptions.enabled).toBe(false);
    });

    it('✅ local 환경에서 비활성화', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.NODE_ENV = 'local';

      SentryConfig.init();

      const initOptions = mockSentryInit.mock.calls[0][0];
      expect(initOptions.enabled).toBe(false);
    });

    it('✅ production 환경에서 활성화', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.NODE_ENV = 'production';

      SentryConfig.init();

      const initOptions = mockSentryInit.mock.calls[0][0];
      expect(initOptions.enabled).toBe(true);
    });
  });

  describe('tracesSampleRate', () => {
    it('✅ production: 0.2 (20% 샘플링)', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.NODE_ENV = 'production';

      SentryConfig.init();

      const initOptions = mockSentryInit.mock.calls[0][0];
      expect(initOptions.tracesSampleRate).toBe(0.2);
    });

    it('✅ development: 1.0 (100% 샘플링)', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.NODE_ENV = 'development';

      SentryConfig.init();

      const initOptions = mockSentryInit.mock.calls[0][0];
      expect(initOptions.tracesSampleRate).toBe(1.0);
    });
  });
});
