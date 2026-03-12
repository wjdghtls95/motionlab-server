import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@common/enums/user-role.enum';
import { DomainException } from '@common/exceptions/domain.exception';

const mockExecutionContext = (
  user: any,
  requiredRoles: UserRole[] | undefined,
): ExecutionContext => {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const setupReflector = (roles: UserRole[] | undefined) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles as any);
  };

  describe('@Roles() 없는 엔드포인트', () => {
    it('✅ roles 메타데이터 없으면 통과', () => {
      setupReflector(undefined);
      const ctx = mockExecutionContext(null, undefined);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('✅ 빈 배열이면 통과', () => {
      setupReflector([]);
      const ctx = mockExecutionContext(null, undefined);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('@Roles(ADMIN) 엔드포인트', () => {
    it('✅ ADMIN 유저는 통과', () => {
      setupReflector([UserRole.ADMIN]);
      const ctx = mockExecutionContext({ role: UserRole.ADMIN }, [
        UserRole.ADMIN,
      ]);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('❌ USER 유저는 403 예외', () => {
      setupReflector([UserRole.ADMIN]);
      const ctx = mockExecutionContext({ role: UserRole.USER }, [
        UserRole.ADMIN,
      ]);
      expect(() => guard.canActivate(ctx)).toThrow(DomainException);
    });

    it('❌ user가 null이면 403 예외', () => {
      setupReflector([UserRole.ADMIN]);
      const ctx = mockExecutionContext(null, [UserRole.ADMIN]);
      expect(() => guard.canActivate(ctx)).toThrow(DomainException);
    });

    it('❌ role 필드 없는 user는 403 예외', () => {
      setupReflector([UserRole.ADMIN]);
      const ctx = mockExecutionContext({ id: 1 }, [UserRole.ADMIN]);
      expect(() => guard.canActivate(ctx)).toThrow(DomainException);
    });
  });

  describe('@Roles(USER, ADMIN) 멀티 역할 엔드포인트', () => {
    it('✅ USER 유저도 통과', () => {
      setupReflector([UserRole.USER, UserRole.ADMIN]);
      const ctx = mockExecutionContext({ role: UserRole.USER }, [
        UserRole.USER,
        UserRole.ADMIN,
      ]);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('✅ ADMIN 유저도 통과', () => {
      setupReflector([UserRole.USER, UserRole.ADMIN]);
      const ctx = mockExecutionContext({ role: UserRole.ADMIN }, [
        UserRole.USER,
        UserRole.ADMIN,
      ]);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});
