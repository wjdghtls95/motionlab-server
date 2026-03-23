import databaseConfig from '@common/config/database.config';

describe('databaseConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('synchronize (R-069)', () => {
    it('✅ 프로덕션에서는 DB_SYNCHRONIZE=true여도 synchronize=false', () => {
      process.env.NODE_ENV = 'production';
      process.env.DB_SYNCHRONIZE = 'true';

      const config = databaseConfig();
      expect(config.synchronize).toBe(false);
    });

    it('✅ 로컬에서 DB_SYNCHRONIZE=true이면 synchronize=true', () => {
      process.env.NODE_ENV = 'local';
      process.env.DB_SYNCHRONIZE = 'true';

      const config = databaseConfig();
      expect(config.synchronize).toBe(true);
    });

    it('✅ 로컬에서 DB_SYNCHRONIZE=false이면 synchronize=false', () => {
      process.env.NODE_ENV = 'local';
      process.env.DB_SYNCHRONIZE = 'false';

      const config = databaseConfig();
      expect(config.synchronize).toBe(false);
    });

    it('✅ 개발 환경에서 DB_SYNCHRONIZE 미설정이면 synchronize=false', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DB_SYNCHRONIZE;

      const config = databaseConfig();
      expect(config.synchronize).toBe(false);
    });
  });
});
