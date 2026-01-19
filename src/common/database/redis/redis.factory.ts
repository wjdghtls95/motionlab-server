import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { RedisDbNumber } from '@common/constants/redis.constant';
import { SystemException } from '@common/exceptions/system.exception';
import { SYSTEM_ERRORS } from '@common/constants/errors/system.errors';
import { Logger } from '@nestjs/common';

/**
 * Redis 클라이언트 생성 팩토리
 */
export class RedisFactory {
  private static readonly logger = new Logger(RedisFactory.name);
  private static configService: ConfigService | null = null;
  private static readonly clients: Map<RedisDbNumber, Redis> = new Map();
  /**
   * ConfigService 초기화 (CoreModule.onModuleInit()에서 호출)
   */
  static initialize(config: ConfigService): void {
    if (RedisFactory.configService) {
      RedisFactory.logger.warn('RedisFactory already initialized');
      return;
    }

    RedisFactory.configService = config;
    RedisFactory.logger.log('RedisFactory initialized successfully');
  }

  /**
   * Redis 클라이언트 생성
   */
  static createRedisClient(
    dbNumber: RedisDbNumber,
    configService?: ConfigService,
  ): Redis {
    // 이미 생성된 클라이언트 반환 (싱글톤)
    if (RedisFactory.clients.has(dbNumber)) {
      return RedisFactory.clients.get(dbNumber)!;
    }

    if (configService && !RedisFactory.configService) {
      RedisFactory.configService = configService;
      RedisFactory.logger.log('RedisFactory auto-initialized');
    }

    // ConfigService 초기화 확인
    if (!RedisFactory.configService) {
      throw new SystemException(SYSTEM_ERRORS.SYS_REDIS_NOT_INITIALIZED, {
        dbNumber: dbNumber,
      });
    }

    // Redis Config 조회
    const redisConfig = RedisFactory.configService.get(`redis.${dbNumber}`);

    if (!redisConfig) {
      throw new SystemException(SYSTEM_ERRORS.SYS_REDIS_CONFIG_NOT_FOUND, {
        dbNumber: dbNumber,
      });
    }

    // Redis 클라이언트 생성
    try {
      const client = new Redis({
        ...redisConfig,
        role: 'master',
        lazyConnect: false, // 즉시 연결 시도
        retryStrategy: (times) => {
          // 재시도 로직: 최대 10회, 점진적 지연
          if (times > 10) {
            return null; // 재시도 중단
          }
          return Math.min(times * 100, 3000); // 최대 3초
        },
      });

      // 연결 에러 핸들링
      client.on('error', (error) => {
        RedisFactory.logger.error(
          `Redis DB ${dbNumber} connection error: ${error.message}`,
          error.stack,
        );
      });

      // 연결 성공 로그
      client.on('connect', () => {
        RedisFactory.logger.log(`Redis DB ${dbNumber} connected successfully`);
      });

      RedisFactory.clients.set(dbNumber, client);

      return client;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      throw new SystemException(SYSTEM_ERRORS.SYS_REDIS_CONNECTION_ERROR, {
        dbNumber: dbNumber,
        error: errorMessage, // string으로 변환
      });
    }
  }

  /**
   * 모든 Redis 클라이언트 조회 (CoreModule 종료 시 사용)
   */
  static getAllRedisClient(): Redis[] {
    return Array.from(RedisFactory.clients.values());
  }

  /**
   * 특정 Redis 클라이언트 조회 (디버깅/모니터링용)
   */
  static getRedisClient(dbNumber: RedisDbNumber): Redis | undefined {
    return RedisFactory.clients.get(dbNumber);
  }

  /**
   * Redis 클라이언트 개수 조회 (헬스체크용)
   */
  static getClientCount(): number {
    return RedisFactory.clients.size;
  }

  /**
   * 특정 Redis 클라이언트가 생성되었는지 확인
   */
  static hasClient(dbNumber: RedisDbNumber): boolean {
    return RedisFactory.clients.has(dbNumber);
  }

  /**
   * 모든 Redis 연결 종료
   */
  static async closeAll(): Promise<void> {
    if (RedisFactory.clients.size === 0) {
      RedisFactory.logger.log('No Redis clients to close');
      return;
    }

    RedisFactory.logger.log(
      `Closing ${RedisFactory.clients.size} Redis clients...`,
    );

    // 전부 종료
    for (const [dbNumber, client] of RedisFactory.clients.entries()) {
      try {
        await client.quit();
        RedisFactory.logger.log(`Redis DB ${dbNumber} closed`);
      } catch (error) {
        RedisFactory.logger.error(`Failed to close Redis DB ${dbNumber}`);
      }
    }

    RedisFactory.clients.clear();
    RedisFactory.configService = null;
    RedisFactory.logger.log('All Redis clients closed');
  }
}
