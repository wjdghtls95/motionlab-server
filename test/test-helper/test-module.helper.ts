import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import appConfig from '@/common/config/app.config';
import databaseConfig from '@/common/config/database.config';
import jwtConfig from '@/common/config/jwt.config';
import { validate } from '@common/validators/env.validator';

/**
 * Integration/Unit Test용 TestingModule 생성
 */
export async function createIntegrationTestModule(
  imports: any[] = [],
  providers: any[] = [],
): Promise<TestingModule> {
  return await Test.createTestingModule({
    imports: [
      // Config
      ConfigModule.forRoot({
        isGlobal: true,
        load: [appConfig, databaseConfig, jwtConfig],
        envFilePath: [`environments/.env.test`],
        validate,
        cache: true,
      }),

      TypeOrmModule.forRootAsync({
        inject: [databaseConfig.KEY],
        useFactory: async (config) => config,
      }),

      ...imports,
    ],
    providers: [...providers],
  }).compile();
}

/**
 * E2E Test용 NestApplication 생성
 */
export async function createE2eTestApp(
  module: TestingModule,
): Promise<INestApplication> {
  const app = module.createNestApplication();

  // 글로벌 설정 (main.ts와 동일)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  return app;
}
