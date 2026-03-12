import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmExModule } from '@common/database/typeorm-ex.module';
import { UserRepository } from '@modules/user/entities/user.repository';

@Module({
  imports: [TypeOrmExModule.forCustomRepository([UserRepository])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmExModule], // Auth, Admin 모듈에서 사용 (TypeOrmExModule이 UserRepository 포함)
})
export class UserModule {}
