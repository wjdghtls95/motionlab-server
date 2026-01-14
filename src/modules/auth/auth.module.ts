import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@modules/user/user.module';
import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import jwtConfig from '@common/config/jwt.config';
import { ConfigType } from '@nestjs/config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      inject: [jwtConfig.KEY],
      useFactory: (config: ConfigType<typeof jwtConfig>) => ({
        secret: config.secret, // 네임스페이스
        signOptions: {
          expiresIn: config.accessExpiresIn as JwtSignOptions['expiresIn'],
        },
      }),
    }),

    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, PassportModule],
})
export class AuthModule {}
