import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  validateSync,
} from 'class-validator';

/**
 * 환경 변수 타입 정의 (DTO 방식)
 */
export enum Environment {
  Development = 'development',
  Production = 'production',
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

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '7d';

  // ==================== CORS ====================
  @IsString()
  @IsOptional()
  CORS_ORIGIN = 'http://localhost:3000';
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
