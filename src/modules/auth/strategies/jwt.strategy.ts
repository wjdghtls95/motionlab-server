import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '@modules/user/entities/user.repository';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';
import { DomainException } from '@common/exceptions/domain.exception';
import { UserRole } from '@common/enums/user-role.enum';

export interface JwtPayload {
  sub: number; // user id
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  /**
   * JWT 토큰 검증 후 호출
   * 반환값은 request.user에 할당됨
   */
  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_TOKEN_INVALID);
    }

    return user; // request.user에 할당
  }
}
