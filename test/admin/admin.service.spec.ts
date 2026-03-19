import { AdminService } from '@modules/admin/admin.service';
import { UserRepository } from '@modules/user/entities/user.repository';
import { UpdateUserRoleDto } from '@modules/admin/dto/update-user-role.dto';
import { UserRole } from '@common/enums/user-role.enum';
import { DomainException } from '@common/exceptions/domain.exception';
import { User } from '@modules/user/entities/user.entity';

const mockUserRepository = () => ({
  findById: jest.fn(),
  save: jest.fn(),
});

const buildUser = (overrides: Partial<User> = {}): User =>
  Object.assign(new User(), {
    id: 1,
    email: 'user@test.com',
    role: UserRole.USER,
    ...overrides,
  });

describe('AdminService', () => {
  let service: AdminService;
  let userRepository: ReturnType<typeof mockUserRepository>;

  beforeEach(() => {
    userRepository = mockUserRepository();
    service = new AdminService(userRepository as unknown as UserRepository);
  });

  describe('updateUserRole', () => {
    it('✅ USER → ADMIN 역할 변경 성공', async () => {
      const user = buildUser({ role: UserRole.USER });
      const dto: UpdateUserRoleDto = { role: UserRole.ADMIN };

      userRepository.findById.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({ ...user, role: UserRole.ADMIN });

      const result = await service.updateUserRole(1, dto);

      expect(userRepository.findById).toHaveBeenCalledWith(1);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.ADMIN }),
      );
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('✅ ADMIN → USER 역할 강등 성공', async () => {
      const user = buildUser({ role: UserRole.ADMIN });
      const dto: UpdateUserRoleDto = { role: UserRole.USER };

      userRepository.findById.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({ ...user, role: UserRole.USER });

      const result = await service.updateUserRole(1, dto);

      expect(result.role).toBe(UserRole.USER);
    });

    it('❌ 존재하지 않는 사용자 → USER_NOT_FOUND 예외', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateUserRole(999, { role: UserRole.ADMIN }),
      ).rejects.toThrow(DomainException);
    });

    it('✅ 이미 동일한 역할이어도 save 호출됨 (멱등성)', async () => {
      const user = buildUser({ role: UserRole.ADMIN });
      const dto: UpdateUserRoleDto = { role: UserRole.ADMIN };

      userRepository.findById.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);

      await service.updateUserRole(1, dto);

      expect(userRepository.save).toHaveBeenCalled();
    });
  });
});
