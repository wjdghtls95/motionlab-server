import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { AppServer } from '@app/app.server';

async function bootstrap(): Promise<void> {
  // NestJS 앱 인스턴스 생성
  const app = await NestFactory.create(AppModule);

  // 서버 설정 클래스에 위임
  const server = new AppServer(app);

  // 실행
  await server.run();
}

void bootstrap();
