import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate } from '@common/validators/env.validator';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';

// Config
import appConfig from '@common/config/app.config';
import databaseConfig from '@common/config/database.config';
import jwtConfig from '@common/config/jwt.config';
import { TypeOrmExModule } from '@common/database/typeorm-ex.module';
import { UserRepository } from '@modules/user/user.repository';

@Module({
  imports: [
    // ConfigModule
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig], // TODO.. 이거 따로 필요한것들만 뽑아서 사용할 수 있는 func 만드는게 좋을듯
      envFilePath: `environments/.env.${process.env.NODE_ENV || 'local'}`,
      validate,
    }),

    // TypeOrmModule (Root)
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: async (config) => ({ ...config, autoLoadEntities: true }),
    }),

    TypeOrmExModule.forCustomRepository([UserRepository]),

    // Domain Modules
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
