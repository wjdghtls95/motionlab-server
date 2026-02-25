import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { AppServer } from '@app/app.server';
import { LoggerBootstrap } from '@common/logger/logger.bootstrap';

async function bootstrap(): Promise<void> {
  // Sentry 초기화 (앱 생성 전 — 생성 중 에러도 캡처하기 위함)
  LoggerBootstrap.initSentry();

  // NestJS 앱 인스턴스 생성
  const app = await NestFactory.create(AppModule, {
    logger: LoggerBootstrap.createLogger(),
  });

  // 서버 설정 클래스에 위임
  const server = new AppServer(app);

  // 실행
  await server.run();
}

void bootstrap();
