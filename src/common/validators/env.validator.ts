import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * 환경 변수 타입 정의 (DTO 방식)
 */
export enum Environment {
  Development = 'development',
  Production = 'production',
  Local = 'local',
  Test = 'test',
}

export class EnvironmentVariables {
  // ==================== Application ====================
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Test;

  @IsString()
  @IsOptional()
  PORT = 4000;

  // ==================== Database ====================
  @IsString()
  DB_HOST: string;

  @IsString()
  @IsOptional()
  DB_PORT: string;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string;

  @IsString()
  @IsOptional()
  DB_SYNCHRONIZE = false;

  @IsBoolean()
  @IsOptional()
  DB_LOGGING = false;

  // ==================== JWT ====================
  @IsString()
  JWT_SECRET: string;

  /** Refresh Token 서명 키. 최소 32자 랜덤값 필수 (openssl rand -hex 32) */
  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '7d';

  // ==================== CORS ====================
  @IsString()
  CORS_ORIGIN: string;

  // ==================== Analyzer ====================
  @IsString()
  @IsOptional()
  ANALYZER_URL = 'http://localhost:8000';

  /** NestJS ↔ FastAPI 내부 인증 키. 최소 32자 랜덤값 필수 (openssl rand -hex 32) */
  @IsString()
  @MinLength(32)
  INTERNAL_API_KEY: string;

  // ==================== MongoDB ====================
  @IsString()
  MONGO_URL: string;

  // ==================== Redis ====================
  @IsString()
  @IsOptional()
  REDIS_HOST = 'localhost';

  @IsString()
  @IsOptional()
  REDIS_PORT = '6379';

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string;
}

/**
 * 환경 변수 검증 함수
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true, // 문자열 -> 숫자 자동 변환
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation error:\n${errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
