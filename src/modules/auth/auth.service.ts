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
import { Redis } from 'ioredis';
import { JwtConfigHelper } from '@common/config/redis.config';
import { ConfigService } from '@nestjs/config';
import { DateUtil } from '@common/utils/date.util';
import { User } from '@modules/user/entities/user.entity';
import { RedisFactory } from '@common/database/redis/redis.factory';
import { REDIS_DB_NUMBER } from '@common/constants/redis.constant';

@Injectable()
export class AuthService {
  private readonly redis: Redis;
  private readonly jwtConfig: JwtConfigHelper;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtConfig = JwtConfigHelper.from(this.configService);
    this.redis = RedisFactory.createRedisClient(
      REDIS_DB_NUMBER.AUTH,
      this.configService,
    );
  }

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
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
    );

    return AuthOutDto.of({
      accessToken,
      refreshToken,
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
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
    );

    return AuthOutDto.of({
      accessToken,
      refreshToken,
      userId: user.id,
      email: user.email,
      name: user.name,
    });
  }

  /**
   * Refresh Token으로 새로운 토큰 발급
   */
  async issueRefreshToken(refreshToken: string): Promise<AuthOutDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.jwtConfig.refreshSecret,
      });

      const storedToken = await this.redis.get(`refresh_token:${payload.sub}`);

      if (!storedToken || storedToken !== refreshToken) {
        throw new DomainException(DOMAIN_ERRORS.AUTH_REFRESH_TOKEN_INVALID);
      }

      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new DomainException(DOMAIN_ERRORS.AUTH_USER_NOT_FOUND);
      }

      const tokens = await this.generateTokens(user.id, user.email);

      return AuthOutDto.of({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userId: user.id,
        email: user.email,
        name: user.name,
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new DomainException(DOMAIN_ERRORS.AUTH_REFRESH_TOKEN_EXPIRED);
      }
      throw new DomainException(DOMAIN_ERRORS.AUTH_REFRESH_TOKEN_INVALID);
    }
  }

  /**
   * 로그아웃
   */
  async logout(user: User): Promise<void> {
    const refreshTokenKey = `refresh_token:${user.id}`;
    await this.redis.del(refreshTokenKey);
  }

  /**
   * Access Token + Refresh Token 생성
   */
  private async generateTokens(
    userId: number,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: userId, email };

    // Access Token 생성
    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtConfig.secret,
      expiresIn: this.jwtConfig.accessExpiresIn as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.jwtConfig.refreshSecret,
      expiresIn: this.jwtConfig.refreshExpiresIn as any,
    });

    // Redis에 저장
    const ttl = DateUtil.parseExpireTime(this.jwtConfig.refreshExpiresIn);

    await this.redis.setex(`refresh_token:${userId}`, ttl, refreshToken);

    return { accessToken, refreshToken };
  }
}
