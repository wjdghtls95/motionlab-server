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
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        // local/test 환경에서는 Rate Limit 사실상 무제한 (개발 편의)
        const isDevEnv = ['local', 'test'].includes(process.env.NODE_ENV ?? '');
        const limit = (prod: number) => (isDevEnv ? 100000 : prod);

        return [
          { name: 'default', ttl: 60000, limit: limit(100) }, // 분당 100회
          { name: 'auth', ttl: 60000, limit: limit(10) }, // 분당 10회
          { name: 'strict', ttl: 60000, limit: limit(5) }, // 분당 5회 (register)
          { name: 'upload', ttl: 3600000, limit: limit(20) }, // 시간당 20회
        ];
      },
    }),

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
