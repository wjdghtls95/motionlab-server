import { ThrottlerBehindProxyGuard } from './throttler-behind-proxy.guard';

// ThrottlerGuard의 의존성(ThrottlerStorage, ThrottlerModuleOptions 등)을 mock으로 대체
const mockThrottlerOptions = {
  throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
};

const mockStorage = {
  increment: jest.fn(),
  getRecord: jest.fn(),
};

const buildGuard = () => {
  const guard = new ThrottlerBehindProxyGuard(
    mockThrottlerOptions as any,
    mockStorage as any,
    null as any,
  );
  return guard;
};

// getTracker는 protected이므로 any 캐스팅으로 직접 호출
const callGetTracker = (guard: ThrottlerBehindProxyGuard, req: any) =>
  (guard as any).getTracker(req);

// ──────────────────────────────────────────
// 테스트 환경에서 NestJS Logger 콘솔 출력 억제
// ──────────────────────────────────────────

beforeAll(() => {
  jest
    .spyOn(console, 'log')
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    .mockImplementation((_msg?: unknown) => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('ThrottlerBehindProxyGuard', () => {
  let guard: ThrottlerBehindProxyGuard;

  beforeEach(() => {
    guard = buildGuard();
  });

  // ─────────────────────────────────────────
  // IP 추출 우선순위 검증
  // ─────────────────────────────────────────

  describe('getTracker — IP 추출 우선순위', () => {
    it('✅ X-Real-IP 헤더가 있으면 해당 IP 반환', async () => {
      const req = { headers: { 'x-real-ip': '203.0.113.1' }, ip: '127.0.0.1' };
      expect(await callGetTracker(guard, req)).toBe('203.0.113.1');
    });

    it('✅ X-Real-IP 없고 X-Forwarded-For 있으면 첫 번째 IP 반환', async () => {
      const req = {
        headers: { 'x-forwarded-for': '203.0.113.2, 10.0.0.1' },
        ip: '127.0.0.1',
      };
      expect(await callGetTracker(guard, req)).toBe('203.0.113.2');
    });

    it('✅ 헤더 없으면 req.ip fallback', async () => {
      const req = { headers: {}, ip: '192.168.1.100' };
      expect(await callGetTracker(guard, req)).toBe('192.168.1.100');
    });

    it('✅ X-Real-IP가 있으면 X-Forwarded-For보다 우선', async () => {
      const req = {
        headers: {
          'x-real-ip': '203.0.113.1',
          'x-forwarded-for': '203.0.113.99',
        },
        ip: '127.0.0.1',
      };
      expect(await callGetTracker(guard, req)).toBe('203.0.113.1');
    });

    it('✅ X-Forwarded-For 공백 포함 시 trim 처리', async () => {
      const req = {
        headers: { 'x-forwarded-for': '  203.0.113.5  , 10.0.0.1' },
        ip: '127.0.0.1',
      };
      expect(await callGetTracker(guard, req)).toBe('203.0.113.5');
    });
  });
});
