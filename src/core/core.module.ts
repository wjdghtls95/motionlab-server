import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from '@common/validators/env.validator';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from '@core/health/health.controller';
import { RedisModule } from '@nestjs-modules/ioredis';

// config
import appConfig from '@common/config/app.config';
import databaseConfig from '@common/config/database.config';
import jwtConfig from '@common/config/jwt.config';
import redisConfig from '@common/config/redis.config';

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
        autoLoadEntities: true, // Entity 자동 로드
      }),
    }),

    // Redis
    RedisModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: async (config) => ({
        type: 'single', // single/cluster
        options: { ...config },
      }),
    }),
  ],
  controllers: [
    HealthController, // Health check
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class CoreModule {}
