import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordUtil } from '@common/utils/password.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthOutDto } from '@modules/auth/dto/auth-out.dto';
import { UserRepository } from '@modules/user/user.repository';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
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
      throw new ConflictException('Email already exists');
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
      throw new UnauthorizedException('Invalid email or password');
    }

    // 비밀번호 검증
    const isPasswordValid = await PasswordUtil.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
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
