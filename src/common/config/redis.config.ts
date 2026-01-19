import { ConfigService, registerAs } from '@nestjs/config';
import { REDIS_DB_NUMBER } from '@common/constants/redis.constant';
import { JwtConfig } from '@common/config/jwt.config';
import { SystemException } from '@common/exceptions/system.exception';
import { SYSTEM_ERRORS } from '@common/constants/errors/system.errors';

export default registerAs('redis', () => {
  const baseConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };

  return {
    [REDIS_DB_NUMBER.SESSION]: { ...baseConfig, db: 0 },
    [REDIS_DB_NUMBER.AUTH]: { ...baseConfig, db: 1 },
    [REDIS_DB_NUMBER.CACHE]: { ...baseConfig, db: 2 },
    [REDIS_DB_NUMBER.DATA]: { ...baseConfig, db: 3 },
  };
});

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

/**
 * JWT 설정 헬퍼
 */
export class JwtConfigHelper {
  constructor(private readonly config: JwtConfig) {}

  get secret(): string {
    return this.config.secret;
  }

  get accessExpiresIn(): string {
    return this.config.accessExpiresIn;
  }

  get refreshSecret(): string {
    return this.config.refreshSecret;
  }

  get refreshExpiresIn(): string {
    return this.config.refreshExpiresIn;
  }

  /**
   * ConfigService에서 생성
   */
  static from(configService: ConfigService): JwtConfigHelper {
    const jwtConfig = configService.get<JwtConfig>('jwt');

    if (!jwtConfig) {
      throw new SystemException(SYSTEM_ERRORS.SYS_JWT_CONFIG_NOT_FOUND);
    }

    return new JwtConfigHelper(jwtConfig);
  }
}
