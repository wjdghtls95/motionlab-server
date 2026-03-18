import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CoreModule } from '@core/core.module';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { SportModule } from '@modules/sport/sport.module';
import { MotionModule } from '@modules/motion/motion.module';
import { AdminModule } from '@modules/admin/admin.module';
import { ThrottlerBehindProxyGuard } from '@common/guards/throttler-behind-proxy.guard';

@Module({
  imports: [
    // Rate Limiting
    // 기본값: 분당 100회 (전체 엔드포인트 상한)
    // 각 엔드포인트별 제한은 @Throttle() 데코레이터로 오버라이드
    //
    // TODO(scale-out): 다중 서버 인스턴스 환경에서는 Redis 스토어로 전환
    // pnpm add @nest-lab/throttler-storage-redis ioredis 후 아래 설정 적용:
    //
    // ThrottlerModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
    //     storage: new ThrottlerStorageRedisService(
    //       new Redis({ host: config.get('REDIS_HOST'), port: config.get('REDIS_PORT') })
    //     ),
    //   }),
    // }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1분 (ms)
        limit: 100, // 분당 100회 (기본 상한)
      },
      {
        name: 'auth',
        ttl: 60000, // 1분
        limit: 10, // 분당 10회 (auth 엔드포인트용)
      },
      {
        name: 'strict',
        ttl: 60000, // 1분
        limit: 5, // 분당 5회 (register 전용)
      },
      {
        name: 'upload',
        ttl: 3600000, // 1시간
        limit: 20, // 시간당 20회
      },
    ]),

    // Core Module
    CoreModule,

    // Domain Modules
    UserModule,
    AuthModule,
    SportModule,
    MotionModule,
    AdminModule,
  ],
  providers: [
    // Nginx 프록시 환경에서 실제 클라이언트 IP 추출 (X-Real-IP 헤더 사용)
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
