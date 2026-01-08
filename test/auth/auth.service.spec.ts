import { TestingModule } from '@nestjs/testing';
import { AuthService } from '@/modules/auth/auth.service';
import { UserRepository } from '@/modules/user/user.repository';
import { getTestModule } from '../test-helper/get-test-module';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestUserHelper } from '../test-helper/test-user.helper';
import { authMockData } from '../mock-data/auth.mock';
import { userMockData } from '../mock-data/user.mock';

describe('AuthService (Integration)', () => {
  let module: TestingModule;
  let authService: AuthService;
  let userRepository: UserRepository;

  beforeAll(async () => {
    // AppModule 기반 모듈 로드
    module = await getTestModule;

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);

    await TestDatabaseHelper.initialize(module);
    TestUserHelper.initialize(userRepository);
  });

  beforeEach(async () => {
    await TestDatabaseHelper.clearAll();
    TestUserHelper.resetCounter();
  });

  afterAll(async () => {
    await TestDatabaseHelper.close();

    // TestingModule 종료
    if (module) {
      await module.close();
    }
  });

  describe('register', () => {
    it('✅ 새 유저 등록 성공', async () => {
      const registerDto = authMockData.validRegister;

      const result = await authService.register(registerDto);

      expect(result.accessToken).toBeDefined();
      expect(result.email).toBe(registerDto.email);

      const savedUser = await userRepository.findByEmail(registerDto.email);

      expect(savedUser).toBeDefined();
    });

    it('❌ 중복 이메일 등록 실패', async () => {
      await TestUserHelper.createUser(userMockData.validUser);

      await expect(
        authService.register(userMockData.validUser),
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('✅ 로그인 성공', async () => {
      await TestUserHelper.createUser(userMockData.validUser);

      const result = await authService.login(authMockData.validLogin);

      expect(result.accessToken).toBeDefined();
      expect(result.email).toBe(authMockData.validLogin.email);
    });

    it('❌ 잘못된 비밀번호', async () => {
      await TestUserHelper.createUser(userMockData.validUser);

      await expect(
        authService.login(authMockData.invalidLogin),
      ).rejects.toThrow();
    });
  });
});
