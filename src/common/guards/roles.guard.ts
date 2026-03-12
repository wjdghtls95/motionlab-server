import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@common/enums/user-role.enum';
import { ROLES_KEY } from '@common/decorators/roles.decorator';
import { DomainException } from '@common/exceptions/domain.exception';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // @Roles() 없는 엔드포인트는 통과
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_FORBIDDEN);
    }

    return true;
  }
}
