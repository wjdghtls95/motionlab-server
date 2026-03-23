import { SwaggerModule } from '@nestjs/swagger';

jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    addBearerAuth: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  })),
  SwaggerModule: {
    createDocument: jest.fn().mockReturnValue({}),
    setup: jest.fn(),
  },
}));

jest.mock('helmet', () => ({
  __esModule: true,
  default: jest.fn(
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
  ),
}));

const mockSwaggerSetup = SwaggerModule.setup as jest.Mock;

const buildMockApp = () =>
  ({
    get: jest.fn().mockReturnValue({
      get: jest.fn(),
    }),
    use: jest.fn(),
    useGlobalFilters: jest.fn(),
    useGlobalPipes: jest.fn(),
    enableCors: jest.fn(),
    listen: jest.fn(),
  } as unknown);

describe('AppServer (R-057, R-058)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    mockSwaggerSetup.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Swagger 조건부 비활성화 (R-058)', () => {
    it('✅ 프로덕션에서는 Swagger 미설정', async () => {
      process.env.NODE_ENV = 'production';

      const { AppServer } = await import('@app/app.server');
      new AppServer(buildMockApp() as any);

      expect(mockSwaggerSetup).not.toHaveBeenCalled();
    });

    it('✅ 로컬 환경에서는 Swagger 활성화', async () => {
      process.env.NODE_ENV = 'local';

      const { AppServer } = await import('@app/app.server');
      new AppServer(buildMockApp() as any);

      expect(mockSwaggerSetup).toHaveBeenCalledWith(
        '/api-docs',
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
