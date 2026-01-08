import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { TypeOrmExModule } from '@common/database/typeorm-ex.module';
import { UserRepository } from '@modules/user/user.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TypeOrmExModule.forCustomRepository([UserRepository]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [TypeOrmExModule], // Auth 모듈에서 사용
})
export class UserModule {}
