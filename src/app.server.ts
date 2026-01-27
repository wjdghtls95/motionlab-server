import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionFilter } from '@common/filters/all-exception.filter';

export class AppServer {
  private readonly configService: ConfigService;

  constructor(private readonly app: INestApplication) {
    this.configService = app.get(ConfigService);
    this.init(); // 인스턴스 생성 시 설정 자동 적용
  }

  /**
   * 서버 미들웨어 및 설정 초기화
   */
  private init(): void {
    // 1. Global Filter (Exception)
    const httpAdapterHost = this.app.get(HttpAdapterHost);
    this.app.useGlobalFilters(new AllExceptionFilter(httpAdapterHost));

    // 2. Global Pipes (Validation)
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // 3. CORS
    this.app.enableCors({
      origin: this.configService.get<string>('app.corsOrigin'),
      credentials: true,
    });

    // 4. Swagger Setup
    this.setupSwagger();
  }

  private setupSwagger(): void {
    const config = new DocumentBuilder()
      .setTitle('MotionLab API')
      .setDescription('Swing Analysis Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(this.app, config);

    SwaggerModule.setup('/api-docs', this.app, document);
  }

  /**
   * 서버 실행
   */
  async run(): Promise<void> {
    const port = this.configService.get<number>('app.port');

    await this.app.listen(port);

    console.log(
      `🚀 Application is running on: http://localhost:${port} & ENV: ${process.env.NODE_ENV}`,
    );
    console.log(`📚 Swagger: http://localhost:${port}/api-docs`);
  }
}
