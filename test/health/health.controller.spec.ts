import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '@app/core/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check()', () => {
    it('status: ok를 반환한다', () => {
      const result = controller.check();
      expect(result.status).toBe('ok');
    });

    it('timestamp를 ISO 8601 형식으로 반환한다', () => {
      const result = controller.check();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('environments 필드를 반환하지 않는다', () => {
      const result = controller.check();
      expect(result).not.toHaveProperty('environments');
    });

    it('status와 timestamp 두 필드만 반환한다', () => {
      const result = controller.check();
      expect(Object.keys(result)).toEqual(['status', 'timestamp']);
    });
  });
});
