import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DomainException } from '@common/exceptions/domain.exception';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';

/**
 * JWT 인증 Guard
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    // 토큰 만료
    if (info?.name === 'TokenExpiredError') {
      throw new DomainException(DOMAIN_ERRORS.AUTH_TOKEN_EXPIRED);
    }

    // 토큰 없음 또는 잘못된 토큰
    if (info?.name === 'JsonWebTokenError' || !user) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_TOKEN_INVALID);
    }

    // 기타 에러
    if (err) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_TOKEN_INVALID);
    }

    return user;
  }
}
