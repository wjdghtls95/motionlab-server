import {
  Global,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validate } from '@common/validators/env.validator';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from '@core/health/health.controller';

// config
import appConfig from '@common/config/app.config';
import databaseConfig from '@common/config/database.config';
import jwtConfig from '@common/config/jwt.config';
import redisConfig from '@common/config/redis.config';
import { RedisFactory } from '@common/database/redis/redis.factory';

@Global() // 전역 모듈로 설정 (AppModule에서 한 번만 import)
@Module({
  imports: [
    // 환경 변수 설정 (Config)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      envFilePath: `environments/.env.${process.env.NODE_ENV || 'local'}`,
      validate,
    }),

    // 데이터베이스 연결 (TypeORM)
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: async (config) => ({
        ...config,
      }),
    }),
  ],
  controllers: [
    HealthController, // Health check
  ],
  providers: [],
  exports: [],
})
export class CoreModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(CoreModule.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 모듈 초기화
   */
  onModuleInit(): void {
    this.logger.log('Initializing CoreModule...');

    // RedisFactory 초기화
    // RedisFactory.initialize(this.configService);

    this.logger.log('CoreModule initialized successfully');
  }

  /**
   * 모듈 종료 시 리소스 정리
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Destroying CoreModule...');

    await Promise.all([
      this._clearRedis(),
      // 필요 시 다른 리소스 정리 추가
    ]);

    this.logger.log('CoreModule destroyed successfully');
  }

  /**
   * Redis 클라이언트 종료
   */
  private async _clearRedis(): Promise<void> {
    try {
      const clients = RedisFactory.getAllRedisClient();

      if (clients.length === 0) {
        this.logger.log('No Redis clients to close');
        return;
      }

      this.logger.log(`Closing ${clients.length} Redis clients...`);

      // Promise.allSettled: 일부 실패해도 나머지 계속 진행
      const results = await Promise.allSettled(
        clients.map((client, index) =>
          client.quit().then(() => {
            this.logger.log(`Redis client ${index} closed successfully`);
          }),
        ),
      );

      // 실패한 클라이언트 로깅
      const failedResults = results.filter((r) => r.status === 'rejected');

      if (failedResults.length > 0) {
        this.logger.warn(
          `Failed to close ${failedResults.length} Redis clients`,
        );

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            this.logger.error(
              `Redis client ${index} close failed: ${result.reason}`,
            );
          }
        });
      } else {
        this.logger.log('All Redis clients closed successfully');
      }
    } catch (error) {
      this.logger.error('Failed to clear Redis clients', error);
    }
  }
}
