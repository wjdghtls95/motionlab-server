import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordUtil } from '@common/utils/password.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthOutDto } from '@modules/auth/dto/auth-out.dto';
import { UserRepository } from '@modules/user/user.repository';
import { DomainException } from '@common/exceptions/domain.exception';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 회원가입
   */
  async register(registerDto: RegisterDto): Promise<AuthOutDto> {
    const existingUser = await this.userRepository.findByEmail(
      registerDto.email,
    );

    // 이메일 중복 확인
    if (existingUser) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_EMAIL_ALREADY_EXISTS);
    }

    // 비밀번호 해싱
    const hashedPassword = await PasswordUtil.hash(registerDto.password);

    // 사용자 생성
    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    // JWT 토큰 생성
    const accessToken = this.generateToken(user.id, user.email);

    return new AuthOutDto({
      accessToken,
      userId: user.id,
      email: user.email,
      name: user.name,
    });
  }

  /**
   * 로그인
   */
  async login(loginDto: LoginDto): Promise<AuthOutDto> {
    // 사용자 조회
    const user = await this.userRepository.findByEmail(loginDto.email);

    if (!user) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_INVALID_CREDENTIALS);
    }

    // 비밀번호 검증
    const isPasswordValid = await PasswordUtil.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_INVALID_CREDENTIALS);
    }

    // JWT 토큰 생성
    const accessToken = this.generateToken(user.id, user.email);

    return new AuthOutDto({
      accessToken,
      userId: user.id,
      email: user.email,
      name: user.name,
    });
  }

  /**
   * JWT 토큰 생성
   */
  private generateToken(userId: number, email: string): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    return this.jwtService.sign(payload);
  }
}
