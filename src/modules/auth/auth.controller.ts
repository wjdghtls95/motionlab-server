import { Controller, Post, Body, Get, Req, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Request } from 'express';
import { AuthOutDto } from '@modules/auth/dto/auth-out.dto';
import { ApiResponseSpec } from '@common/decorators/api-response-spec.decorator';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';

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

  @Get('profile')
  @ApiResponseSpec({
    summary: '내 프로필 조회',
    auth: true, // JwtAuthGuard + ApiBearerAuth 자동 적용
    type: AuthOutDto,
    errors: [
      DOMAIN_ERRORS.AUTH_TOKEN_INVALID,
      DOMAIN_ERRORS.AUTH_TOKEN_EXPIRED,
    ],
  })
  async getProfile(@Req() req: Request) {
    return req.user;
  }
}
