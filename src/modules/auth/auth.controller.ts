import { Controller, Post, Body, Request, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthOutDto } from '@modules/auth/dto/auth-out.dto';
import { ApiResponseSpec } from '@common/decorators/api-response-spec.decorator';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiResponseSpec({
    summary: '회원가입',
    status: HttpStatus.CREATED,
    type: AuthOutDto,
    errors: [DOMAIN_ERRORS.AUTH_EMAIL_ALREADY_EXISTS],
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthOutDto> {
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @ApiResponseSpec({
    summary: '로그인',
    status: HttpStatus.CREATED,
    type: AuthOutDto,
    errors: [DOMAIN_ERRORS.AUTH_EMAIL_ALREADY_EXISTS],
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthOutDto> {
    return await this.authService.login(loginDto);
  }

  @Post('refresh')
  @ApiResponseSpec({
    summary: '토큰 재발급',
    status: HttpStatus.OK,
    type: AuthOutDto,
    errors: [
      DOMAIN_ERRORS.AUTH_REFRESH_TOKEN_INVALID,
      DOMAIN_ERRORS.AUTH_REFRESH_TOKEN_EXPIRED,
      DOMAIN_ERRORS.AUTH_USER_NOT_FOUND,
    ],
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthOutDto> {
    return this.authService.issueRefreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @ApiResponseSpec({
    summary: '로그아웃',
    auth: true,
    status: HttpStatus.NO_CONTENT,
    errors: [
      DOMAIN_ERRORS.AUTH_TOKEN_INVALID,
      DOMAIN_ERRORS.AUTH_TOKEN_EXPIRED,
    ],
  })
  async logout(@Request() req): Promise<void> {
    await this.authService.logout(req.user);
  }
}
