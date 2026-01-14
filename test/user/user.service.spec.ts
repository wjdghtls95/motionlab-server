import { TestingModule } from '@nestjs/testing';
import { getTestModule } from '../test-helper/get-test-module';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestUserHelper } from '../test-helper/test-user.helper';
import { userMockData } from '../mock-data/user.mock';
import { DomainException } from '@common/exceptions/domain.exception';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';
import { UserService } from '@modules/user/user.service';
import { UserRepository } from '@modules/user/user.repository';

describe('UserService (Integration)', () => {
  let module: TestingModule;
  let userService: UserService;
  let userRepository: UserRepository;

  beforeAll(async () => {
    module = await getTestModule;

    userService = module.get<UserService>(UserService);
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

    if (module) {
      await module.close();
    }
  });

  describe('findAll', () => {
    it('✅ 모든 유저 조회', async () => {
      await TestUserHelper.createUsers(3);

      const result = await userService.findAll();

      expect(result).toHaveLength(3);
    });

    it('✅ 유저 없을 때 빈 배열', async () => {
      const result = await userService.findAll();

      expect(result).toHaveLength(0);
    });

    it('✅ 대량 데이터 조회 성능', async () => {
      await TestUserHelper.createUsers(100);

      const startTime = Date.now();
      const result = await userRepository.findAll();
      const duration = Date.now() - startTime;

      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // 1초 이내
    });
  });

  describe('findOne', () => {
    it('✅ ID로 유저 조회', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);

      const result = await userRepository.findById(user.id);

      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
    });
  });

  describe('update', () => {
    it('✅ 유저 정보 수정', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);
      const updateDto = { name: 'Updated Name' };

      const result = await userService.update(user.id, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.email).toBe(user.email);

      const updatedUser = await userRepository.findByEmail(user.email);
      expect(updatedUser.name).toBe(updateDto.name);
    });

    it('❌ 존재하지 않는 유저 수정', async () => {
      await expect(userService.update(99999, { name: 'Test' })).rejects.toThrow(
        DomainException,
      );

      // 에러 코드 검증
      try {
        await userService.update(99999, { name: 'Test' });
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect(error.code).toBe(DOMAIN_ERRORS.USER_NOT_FOUND.code);
      }
    });
  });

  describe('remove', () => {
    it('✅ 유저 삭제', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);

      await userService.remove(user.id);

      const deletedUser = await userRepository.findByEmail(user.email);
      expect(deletedUser).toBeNull();
    });

    it('❌ 존재하지 않는 유저 삭제', async () => {
      await expect(userService.remove(99999)).rejects.toThrow(DomainException);
    });
  });

  describe('findByEmail', () => {
    it('✅ 이메일로 유저 조회', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);

      const result = await userRepository.findByEmail(user.email);

      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
    });

    it('✅ 존재하지 않는 이메일은 null', async () => {
      const result = await userRepository.findByEmail('notfound@test.com');

      expect(result).toBeNull();
    });

    it('✅ SQL Injection 방어', async () => {
      const maliciousEmail = "admin'--";

      const result = await userRepository.findByEmail(maliciousEmail);

      expect(result).toBeNull();
    });
  });
});
