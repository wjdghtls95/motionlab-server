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

@Module({
  imports: [
    // ConfigModule
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig], // TODO.. 이거 따로 필요한것들만 뽑아서 사용할 수 있는 func 만드는게 좋을듯
      envFilePath: `environments/.env.${process.env.NODE_ENV || 'test'}`,
      validate,
    }),

    // TypeOrmModule (Root)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
      }),
    }),

    // Domain Modules
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
