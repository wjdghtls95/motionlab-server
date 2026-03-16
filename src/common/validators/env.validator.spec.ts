import 'reflect-metadata';
import { validate } from './env.validator';

/**
 * 테스트용 최소 유효 환경변수.
 * 실제 환경변수는 항상 문자열로 주입되므로 숫자/불리언 값도 문자열로 지정.
 */
const baseConfig = () => ({
  PORT: '3000',
  DB_HOST: 'localhost',
  DB_USERNAME: 'root',
  DB_PASSWORD: 'password',
  DB_DATABASE: 'motionlab',
  DB_SYNCHRONIZE: 'false',
  JWT_SECRET: 'some-jwt-secret',
  JWT_REFRESH_SECRET: 'a'.repeat(32), // 최소 32자
  INTERNAL_API_KEY: 'a'.repeat(32), // 최소 32자
  MONGO_URL: 'mongodb://localhost:27017/motionlab',
});

describe('env.validator', () => {
  describe('INTERNAL_API_KEY', () => {
    it('✅ 32자 이상이면 유효', () => {
      const config = baseConfig();
      expect(() => validate(config)).not.toThrow();
    });

    it('✅ 64자 hex 키도 유효', () => {
      const config = {
        ...baseConfig(),
        INTERNAL_API_KEY: 'f'.repeat(64), // 64자 더미 hex 형식
      };
      expect(() => validate(config)).not.toThrow();
    });

    it('❌ 31자 이하면 검증 실패', () => {
      const config = { ...baseConfig(), INTERNAL_API_KEY: 'a'.repeat(31) };
      expect(() => validate(config)).toThrow(/Configuration validation error/);
    });

    it('❌ 예측 가능한 기본값(motionlab-internal-key)은 검증 실패', () => {
      const config = {
        ...baseConfig(),
        INTERNAL_API_KEY: 'motionlab-internal-key', // 21자 → MinLength(32) 위반
      };
      expect(() => validate(config)).toThrow(/Configuration validation error/);
    });

    it('❌ 빈 문자열이면 검증 실패', () => {
      const config = { ...baseConfig(), INTERNAL_API_KEY: '' };
      expect(() => validate(config)).toThrow(/Configuration validation error/);
    });

    it('❌ 누락이면 검증 실패', () => {
      const config = baseConfig();
      delete (config as any).INTERNAL_API_KEY;
      expect(() => validate(config)).toThrow(/Configuration validation error/);
    });
  });

  describe('JWT_REFRESH_SECRET', () => {
    it('✅ 32자 이상이면 유효', () => {
      const config = baseConfig();
      expect(() => validate(config)).not.toThrow();
    });

    it('❌ 31자 이하면 검증 실패', () => {
      const config = { ...baseConfig(), JWT_REFRESH_SECRET: 'a'.repeat(31) };
      expect(() => validate(config)).toThrow(/Configuration validation error/);
    });

    it('❌ 누락이면 검증 실패', () => {
      const config = baseConfig();
      delete (config as any).JWT_REFRESH_SECRET;
      expect(() => validate(config)).toThrow(/Configuration validation error/);
    });
  });

  describe('MONGO_URL', () => {
    it('✅ 유효한 MongoDB URL이면 통과', () => {
      const config = baseConfig();
      expect(() => validate(config)).not.toThrow();
    });

    it('❌ 누락이면 검증 실패', () => {
      const config = baseConfig();
      delete (config as any).MONGO_URL;
      expect(() => validate(config)).toThrow(/Configuration validation error/);
    });
  });

  describe('ANALYZER_URL', () => {
    it('✅ 누락 시 기본값 http://localhost:8000 사용', () => {
      const config = baseConfig();
      const result = validate(config);
      expect(result.ANALYZER_URL).toBe('http://localhost:8000');
    });

    it('✅ 명시적 값 설정 시 해당 값 사용', () => {
      const config = {
        ...baseConfig(),
        ANALYZER_URL: 'http://fastapi:8000',
      };
      const result = validate(config);
      expect(result.ANALYZER_URL).toBe('http://fastapi:8000');
    });
  });
});
