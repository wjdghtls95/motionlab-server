import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordUtil } from '@common/utils/password.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthOutDto } from '@modules/auth/dto/auth-out.dto';
import { UserRepository } from '@modules/user/entities/user.repository';
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
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // 기존 Refresh Token 확인 및 재사용 시도
    const existingRefreshToken = await this.getValidRefreshToken(user.id);

    if (existingRefreshToken) {
      // 유효한 기존 토큰이 있으면 Access Token만 새로 발급
      const accessToken = this.generateAccessToken(user.id, user.email);

      return AuthOutDto.of({
        accessToken,
        refreshToken: existingRefreshToken,
        userId: user.id,
        email: user.email,
        name: user.name,
      });
    }

    // 기존 토큰이 없거나 만료됨 -> 새 토큰 쌍 발급
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
      const payload = this.verifyRefreshToken(refreshToken);

      const storedToken = await this.redis.get(`refresh_token:${payload.sub}`);

      if (!storedToken) {
        throw new DomainException(DOMAIN_ERRORS.AUTH_REFRESH_TOKEN_INVALID);
      }

      if (storedToken !== refreshToken) {
        throw new DomainException(DOMAIN_ERRORS.AUTH_REFRESH_TOKEN_INVALID);
      }

      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new DomainException(DOMAIN_ERRORS.AUTH_USER_NOT_FOUND);
      }

      const accessToken = this.generateAccessToken(user.id, user.email);

      return AuthOutDto.of({
        accessToken,
        refreshToken,
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

  // ======================== Private Helper ========================

  /**
   * 사용자 인증
   */
  private async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_INVALID_CREDENTIALS);
    }

    const isPasswordValid = await PasswordUtil.compare(password, user.password);

    if (!isPasswordValid) {
      throw new DomainException(DOMAIN_ERRORS.AUTH_INVALID_CREDENTIALS);
    }

    return user;
  }

  /**
   * 유효한 Refresh Token 조회
   */
  private async getValidRefreshToken(userId: number): Promise<string | null> {
    const existingToken = await this.redis.get(`refresh_token:${userId}`);

    if (!existingToken) {
      return null;
    }

    try {
      // 토큰 검증
      this.jwtService.verify(existingToken, {
        secret: this.jwtConfig.refreshSecret,
      });

      // TTL 확인 (30분 이하면 새로 발급)
      const ttl = await this.redis.ttl(`refresh_token:${userId}`);

      if (ttl < 1800) {
        // 30분 = 1800초
        return null;
      }

      return existingToken;
    } catch (error) {
      // 무효한 토큰 삭제
      await this.redis.del(`refresh_token:${userId}`);
      return null;
    }
  }

  /**
   * Refresh Token 검증
   */
  private verifyRefreshToken(refreshToken: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.jwtConfig.refreshSecret,
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new DomainException(DOMAIN_ERRORS.AUTH_REFRESH_TOKEN_EXPIRED);
      }
      throw new DomainException(DOMAIN_ERRORS.AUTH_REFRESH_TOKEN_INVALID);
    }
  }

  /**
   * Access Token 생성
   */
  private generateAccessToken(userId: number, email: string): string {
    const payload: JwtPayload = { sub: userId, email };

    return this.jwtService.sign(payload, {
      secret: this.jwtConfig.secret,
      expiresIn: this.jwtConfig.accessExpiresIn as any,
    });
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
